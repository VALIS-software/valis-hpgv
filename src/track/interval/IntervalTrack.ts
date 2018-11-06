import UsageCache from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { Object2D } from "engine/ui/Object2D";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { Tile, TileState } from "../TileLoader";
import TrackObject from "../TrackObject";
import IntervalTileLoader, { IntervalTilePayload } from "./IntervalTileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";

export class IntervalTrack extends TrackObject<IntervalTrackModel, IntervalTileLoader> {

    readonly intervalColor = [74 / 0xff, 52 / 0xff, 226 / 0xff, 0.66];

    constructor(model: IntervalTrackModel) {
        super(model);
        if (model.color != null) {
            this.intervalColor = model.color;
        }
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

            let tileLoader = this.getTileLoader();

            tileLoader.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                if (tile.state === TileState.Complete) {
                    this.displayTileNode(tile, 0.9, x0, span, continuousLodLevel);
                } else {
                    // if the tile is incomplete then wait until complete and call updateAnnotations() again
                    this._pendingTiles.get(this.contig + ':' + tile.key, () => this.createTileLoadingDependency(tile));

                    // display a fallback tile if one is loaded at this location
                    let gapCenterX = tile.x + tile.span * 0.5;
                    let fallbackTile = tileLoader.getTile(gapCenterX, 1 << tileLoader.macroLodLevel, false);

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

    protected displayTileNode(tile: Tile<IntervalTilePayload>, z: number, x0: number, span: number, continuousLodLevel: number) {
        let tileKey = this.contig + ':' + z + ':' + tile.key;

        let node = this._intervalTileCache.get(tileKey, () => {
            return this.createTileNode(tile);
        });

        node.relativeX = (tile.x - x0) / span;
        node.relativeW = tile.span / span;
        node.z = z;

        // decrease opacity at large lods to prevent white-out as interval cluster together and overlap
        let e = 2;
        let t = Math.pow((Math.max(continuousLodLevel - 2, 0) / 15), e);
        node.opacity = Scalar.lerp(1, 0.1, Scalar.clamp(t, 0, 1));

        this._onStage.get(tileKey, () => {
            this.add(node);
            return node;
        });

        return node;
    }
    
    protected createTileNode(tile: Tile<IntervalTilePayload>) {
        let nIntervals = tile.payload.intervals.length * 0.5;

        let instanceData = new Array<IntervalInstance>(nIntervals);


        for (let i = 0; i < nIntervals; i++) {
            let intervalStartIndex = tile.payload.intervals[i * 2 + 0];
            let intervalSpan = tile.payload.intervals[i * 2 + 1];
            instanceData[i] = this.createInstance(
                tile.payload,
                i,
                (intervalStartIndex - tile.x) / tile.span,
                intervalSpan / tile.span,
            );
        }

        let instancesTile = new IntervalInstances(instanceData);
        instancesTile.minWidth = 0.5;
        instancesTile.blendFactor = 0.2; // nearly full additive
        instancesTile.y = 0;
        instancesTile.mask = this;
        instancesTile.relativeH = 1;

        return instancesTile;
    }

    protected createInstance(tilePayload: IntervalTilePayload, intervalIndex: number, relativeX: number, relativeW: number): IntervalInstance {
        const yPadding = 5;

        return {
            x: 0,
            y: yPadding,
            z: 0,
            w: 0,
            h: - 2 * yPadding,
            relativeX: relativeX,
            relativeY: 0,
            relativeW: relativeW,
            relativeH: 1.0,
            color: this.intervalColor,
        };
    }

    protected removeTile = (tile: IntervalInstances) => {
        this.remove(tile);
    }

}

export default IntervalTrack;