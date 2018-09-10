import Animator from "engine/animation/Animator";
import UsageCache from "engine/ds/UsageCache";
import Scalar from "engine/math/Scalar";
import TrackModel from "../../model/TrackModel";
import { DEFAULT_SPRING } from "../UIConstants";
import Object2D from "engine/ui/Object2D";
import TileStore, { Tile, TileState } from "../../model/data-store/TileStore";
import { TrackObject } from "./BaseTrack";
import SharedTileStore from "../../model/data-store/SharedTileStores";

/**
 * TileTrack provides a base class for Tracks that use TileStore
 */
export class ShaderTrack<TilePayload, BlockPayload> extends TrackObject {

    get pixelRatio() { return this._pixelRatio; }

    set pixelRatio(v: number) {
        this._pixelRatio = v;
        this.displayNeedUpdate = true;
    }

    protected densityMultiplier = 1.0;
    protected tileStore: TileStore<TilePayload, BlockPayload>;
    protected _pixelRatio: number = window.devicePixelRatio || 1;

    constructor(
        model: TrackModel,
        protected tileStoreType: string,
        protected tileStoreConstructor: (contig: string) => TileStore<TilePayload, BlockPayload>,
    ) {
        super(model);
    }

    setContig(contig: string) {
        this.tileStore = SharedTileStore.getTileStore(
            this.tileStoreType,
            contig,
            this.tileStoreConstructor
        );
        super.setContig(contig);
    }

    protected constructTileNode() {
        return new TileNode<TilePayload>();
    }

    protected _tileNodeCache = new UsageCache<TileNode<TilePayload>>();

    protected updateDisplay() {
        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        this._tileNodeCache.markAllUnused();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);
            let samplingDensity = this.densityMultiplier * basePairsPerDOMPixel / this.pixelRatio;
            let displayLodLevel = Scalar.log2(Math.max(samplingDensity, 1));
            let lodLevel = Math.floor(displayLodLevel);

            this.tileStore.getTiles(x0, x1, samplingDensity, true, (tile) => {
                let tileNode = this._tileNodeCache.get(this.contig + ':' + tile.key, this.createTileNode);
                this.updateTileNode(tileNode, tile, x0, span, displayLodLevel);

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
                        if (!this.tileStore.isWithinInitializedLodRange(fallbackDensity)) break;

                        let fallbackTile = this.tileStore.getTile(gapCenterX, fallbackDensity, false);

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

                            let fallbackNode = this._tileNodeCache.get(this.contig + ':' + fallbackTile.key, this.createTileNode);
                            this.updateTileNode(fallbackNode, fallbackTile, x0, span, displayLodLevel);

                            // @! improve this
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

        this._tileNodeCache.removeUnused(this.deleteTileNode);
        this.displayNeedUpdate = false;
    }

    protected createTileNode = (): TileNode<TilePayload> => {
        // create empty tile node
        let tileNode = this.constructTileNode();
        tileNode.mask = this;
        this.add(tileNode);
        return tileNode;
    }

    protected deleteTileNode = (tileNode: TileNode<TilePayload>) => {
        tileNode.setTile(null); // ensure cleanup is performed
        tileNode.releaseGPUResources();
        this.remove(tileNode);
    }

    protected updateTileNode(tileNode: TileNode<TilePayload>, tile: Tile<any>, x0: number, span: number, displayLodLevel: number) {
        tileNode.layoutParentX = (tile.x - x0) / span;
        tileNode.layoutW = tile.span / span;
        tileNode.layoutH = 1;
        tileNode.displayLodLevel = displayLodLevel;
        tileNode.setTile(tile);
    }

    protected tileNodeIsOpaque(tileNode: TileNode<any>) {
        return (tileNode.render === true) &&
            (tileNode.opacity >= 1) &&
            (tileNode.getTile().state === TileState.Complete);
    }

}

export class TileNode<TilePayload> extends Object2D {

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