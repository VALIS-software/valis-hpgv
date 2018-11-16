import Animator from "../Animator";
import UsageCache from "engine/ds/UsageCache";
import Object2D from "engine/ui/Object2D";
import { DEFAULT_SPRING } from "../ui/UIConstants";
import { Tile, TileLoader, TileState } from "./TileLoader";
import { TrackModel } from "./TrackModel";
import { TrackObject } from "./TrackObject";

interface CustomTileNode<Payload> {
    new(): ShaderTile<Payload>;
}

export class ShaderTrack<
    Model extends TrackModel,
    Loader extends TileLoader<TilePayload, any>,
    TilePayload = any
> extends TrackObject<Model, Loader> {

    protected densityMultiplier = 1.0;

    constructor(model: Model, protected customTileNodeClass: CustomTileNode<TilePayload>) {
        super(model);
    }

    protected _tileNodeCache = new UsageCache<ShaderTile<TilePayload>>();

    protected updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        this._tileNodeCache.markAllUnused();

        if (widthPx > 0) {
            let tileLoader = this.getTileLoader();

            tileLoader.forEachTile(this.x0, this.x1, samplingDensity, true, (tile) => {
                let tileNode = this._tileNodeCache.get(this.contig + ':' + tile.key, () => this.createTileNode());
                this.updateTileNode(tileNode, tile, this.x0, span, continuousLodLevel);

                // main tiles are positioned front-most so they appear above any fallback tiles
                tileNode.z = 1.0;

                // if tileNode is not opaque and displaying data then we've got a gap to fill
                if (!this.tileNodeIsOpaque(tileNode)) {
                    let gapCenterX = tile.x + tile.span * 0.5;

                    // limit the number of loading-fade-in tiles to improve performance
                    let loadingTilesAllowed = 1;
                    let fadingTilesAllowed = 1;

                    // fill with larger tiles (higher lod level)
                    for (let p = 1; p < 30; p++) {
                        let densityMultiplier = 1 << p; // p must not exceed 30 or 1 << p will overflow
                        let fallbackDensity = samplingDensity * densityMultiplier;

                        // exhausted all available lods
                        if (!tileLoader.isWithinInitializedLodRange(fallbackDensity)) break;

                        let fallbackTile = tileLoader.getTile(gapCenterX, fallbackDensity, false);

                        // it's possible we end up with the same lod we already have, if so, skip it
                        if (fallbackTile.lodLevel === tile.lodLevel) continue;

                        // can we use this tile as a fallback?
                        if (
                            ((loadingTilesAllowed > 0) && (fallbackTile.state === TileState.Loading)) ||
                            (fallbackTile.state === TileState.Complete)
                        ) {
                            if (fallbackTile.state === TileState.Loading) {
                                loadingTilesAllowed--;
                            }

                            let fallbackNode = this._tileNodeCache.get(this.contig + ':' + fallbackTile.key, () => this.createTileNode());
                            this.updateTileNode(fallbackNode, fallbackTile, this.x0, span, continuousLodLevel);

                            // z-position tile so that better lods are front-most
                            fallbackNode.z = (1.0 - fallbackTile.lodLevel / 50) - 0.1;

                            // remove the tile if it's currently fading in and we've run out of fading tile budget
                            let tileIsFading = (fallbackTile.state === TileState.Complete) && (fallbackNode.opacity < 1);

                            if (tileIsFading) {
                                if (fadingTilesAllowed <= 0) {
                                    // this is a fading tile and we've run out of fading tile budget
                                    // mark it as unused so it's removed by UsageCache
                                    this._tileNodeCache.markUnused(this.contig + ':' + fallbackTile.key);
                                    continue;
                                } else {
                                    fadingTilesAllowed--;
                                }
                            }

                            // if the fallback node is opaque then we've successfully plugged the gap
                            if (this.tileNodeIsOpaque(fallbackNode)) {
                                break;
                            }
                        }
                    }
                }
            });

        }

        this._tileNodeCache.removeUnused((t) => this.deleteTileNode(t));
    }

    protected createTileNode(): ShaderTile<TilePayload> {
        // create empty tile node
        let tileNode = new this.customTileNodeClass();
        tileNode.mask = this;
        this.add(tileNode);
        return tileNode;
    }

    protected deleteTileNode(tileNode: ShaderTile<TilePayload>) {
        tileNode.setTile(null); // ensure cleanup is performed
        tileNode.releaseGPUResources();
        this.remove(tileNode);
    }

    protected updateTileNode(tileNode: ShaderTile<TilePayload>, tile: Tile<any>, x0: number, span: number, displayLodLevel: number) {
        tileNode.relativeX = (tile.x - x0) / span;
        tileNode.relativeW = tile.span / span;
        tileNode.relativeH = 1;
        tileNode.displayLodLevel = displayLodLevel;
        tileNode.setTile(tile);
    }

    protected tileNodeIsOpaque(tileNode: ShaderTile<any>) {
        return (tileNode.render === true) &&
            (tileNode.opacity >= 1) &&
            (tileNode.getTile().state === TileState.Complete);
    }

}

export class ShaderTile<TilePayload> extends Object2D {

    set opacity(opacity: number) {
        this._opacity = opacity;
        // switch to opaque rendering as soon as opacity hits 1
        this.transparent = opacity < 1;
    }

    get opacity() {
        return this._opacity;
    }

    displayLodLevel: number;

    protected _opacity: number;
    protected tile: Tile<TilePayload>;

    constructor() {
        super();
        this.opacity = 1;
        this.render = false;
    }
    
    setTile(tile: Tile<TilePayload>) {
        // early exit case
        if (tile === this.tile) return;

        if (this.tile != null) {
            this.tile.removeEventListener('complete', this.tileCompleteListener);
        }

        this.tile = tile;

        if (tile != null) {
            if (tile.state === TileState.Complete) {
                this.opacity = 1;
                this.onTileComplete();
            } else {
                tile.addEventListener('complete', this.tileCompleteListener);
                this.opacity = 0;
                this.render = false;
            }
        } else {
            this.render = false;
        }
    }

    getTile() {
        return this.tile;
    }

    protected tileCompleteListener = () => {
        this.tile.removeEventListener('complete', this.tileCompleteListener);
        this.onTileComplete();
    }

    protected onTileComplete() {
        Animator.springTo(this, { 'opacity': 1 }, DEFAULT_SPRING);
        this.render = true;
        this.gpuResourcesNeedAllocate = true;
    }

}

export default ShaderTrack;