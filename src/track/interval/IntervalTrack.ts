import UsageCache from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import IntervalTileCache from "./IntervalTileCache";
import { Tile, TileState } from "../TileCache";
import { Object2D } from "engine/ui/Object2D";
import TrackObject from "../TrackObject";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { IntervalTrackModel } from "./IntervalTrackModel";
import GenomeBrowser from "../../GenomeBrowser";

type TilePayload = Float32Array;

export class IntervalTrack extends TrackObject<IntervalTrackModel, IntervalTileCache> {
    
    blendEnabled: boolean = true;

    constructor(model: IntervalTrackModel) {
        super(model, model.tileCacheType + ':' + JSON.stringify(model.query));
        this.setBlendMode(model.blendEnabled);
    }

    setBlendMode(enabled: boolean) {
        this.blendEnabled = enabled;
    }

    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected _intervalTileCache = new UsageCache<IntervalInstances>();
    protected _onStage = new UsageCache<Object2D>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStage.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let tileCache = this.getTileCache();

            tileCache.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                if (tile.state === TileState.Complete) {
                    this.displayTileNode(tile, 0.9, x0, span, continuousLodLevel);
                } else {
                    // if the tile is incomplete then wait until complete and call updateAnnotations() again
                    this._pendingTiles.get(this.contig + ':' + tile.key, () => this.createTileLoadingDependency(tile));

                    // display a fallback tile if one is loaded at this location
                    let gapCenterX = tile.x + tile.span * 0.5;
                    let fallbackTile = tileCache.getTile(gapCenterX, 1 << tileCache.macroLodLevel, false);

                    if (fallbackTile.state === TileState.Complete) {
                        // display fallback tile behind other tiles
                        this.displayTileNode(fallbackTile, 0.3, x0, span, continuousLodLevel);
                    }
                }
            });
        }

        this.displayNeedUpdate = false;
        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this._onStage.removeUnused(this.removeTile);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

    protected displayTileNode(tile: Tile<TilePayload>, z: number, x0: number, span: number, continuousLodLevel: number) {
        let tileKey = this.contig + ':' + z + ':' + tile.key;

        let node = this._intervalTileCache.get(tileKey, () => {
            return this.createTileNode(tile);
        });

        node.layoutParentX = (tile.x - x0) / span;
        node.layoutW = tile.span / span;
        node.z = z;

        // decrease opacity at large lods to prevent white-out as interval cluster together and overlap
        let e = 2;
        let t = Math.pow((Math.max(continuousLodLevel - 2, 0) / 15), e);
        node.opacity = this.blendEnabled ? Scalar.lerp(1, 0.1, Scalar.clamp(t, 0, 1)) : 1.0;

        this._onStage.get(tileKey, () => {
            this.add(node);
            return node;
        });
    }
    
    protected createTileNode(tile: Tile<TilePayload>) {
        let nIntervals = tile.payload.length * 0.5;

        let instanceData = new Array<IntervalInstance>(nIntervals);

        for (let i = 0; i < nIntervals; i++) {
            let intervalStartIndex = tile.payload[i * 2 + 0];
            let intervalSpan = tile.payload[i * 2 + 1];

            let fractionX = (intervalStartIndex - tile.x) / tile.span
            let wFractional = intervalSpan / tile.span;
            instanceData[i] = {
                xFractional: fractionX,
                wFractional: wFractional,
                y: 0,
                z: 0,
                h: 35,
                color: [74/0xff, 52/0xff, 226/0xff, 0.66],
            };
        }

        let instancesTile = new IntervalInstances(instanceData);
        instancesTile.minWidth = 0.5;
        instancesTile.blendFactor = 0.2; // nearly full additive
        instancesTile.y = 5;
        instancesTile.mask = this;

        return instancesTile;
    }

    protected removeTile = (tile: IntervalInstances) => {
        this.remove(tile);
    }

}

GenomeBrowser.registerTrackType('interval', IntervalTileCache, IntervalTrack);

export default IntervalTrack;