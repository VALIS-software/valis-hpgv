import UsageCache from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { Object2D } from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { Tile, TileState } from "../TileLoader";
import TrackObject from "../TrackObject";
import IntervalTileLoader, { IntervalTilePayload } from "./IntervalTileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";
import { Rect } from "engine/ui/Rect";
import { MadaRegular } from "../../ui/font/Fonts";
import { Renderable } from "engine/rendering/Renderable";

export class IntervalTrack<Model extends IntervalTrackModel = IntervalTrackModel> extends TrackObject<Model, IntervalTileLoader> {

    // the following should only be changed at initialization
    // otherwise the caches should be cleared and updateDisplay called
    protected intervalColor = [74 / 0xff, 52 / 0xff, 226 / 0xff, 0.66];
    protected yPadding = 5;

    protected intervalLabels = false;
    protected labelWidthThresholdPx = 2;

    constructor(model: Model) {
        super(model);
        if (model.color != null) {
            this.intervalColor = model.color;
        }
    }

    // @! needs releasing
    protected _intervalTileCache = new UsageCache<IntervalInstances>(null, (instances) => instances.releaseGPUResources());
    protected _tileNodes = new UsageCache<IntervalInstances>(null, (t) => this.removeTileNode(t));
    protected _labels = new UsageCache<IntervalTrackLabel>(null, (label) => this.removeLabel(label));
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        this._tileNodes.markAllUnused();
        this._labels.markAllUnused();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);

            let tileLoader = this.getTileLoader();

            tileLoader.forEachTile(this.x0, this.x1, basePairsPerDOMPixel, true, (tile) => {
                if (tile.state === TileState.Complete) {
                    this.displayTileNode(tile, 0.9, continuousLodLevel);
                } else {
                    // display a fallback tile if one is loaded at this location
                    let gapCenterX = tile.x + tile.span * 0.5;
                    let fallbackTile = tileLoader.getTile(gapCenterX, 1 << tileLoader.macroLodLevel, false);

                    if (fallbackTile.state === TileState.Complete) {
                        // display fallback tile behind other tiles
                        this.displayTileNode(fallbackTile, 0.3, continuousLodLevel);
                    }
                }
            });
        }

        this._tileNodes.removeUnused();
        this._labels.removeUnused();
    }

    protected displayTileNode(tile: Tile<IntervalTilePayload>, z: number, continuousLodLevel: number) {
        const span = this.x1 - this.x0;
        let tileKey = this.contig + ':' + z + ':' + tile.key;

        let node = this._intervalTileCache.get(tileKey, () => {
            return this.createTileNode(tile);
        });

        node.relativeX = (tile.x - this.x0) / span;
        node.relativeW = tile.span / span;
        node.z = z;

        // decrease opacity at large lods to prevent white-out as interval cluster together and overlap
        let e = 2;
        let t = Math.pow((Math.max(continuousLodLevel - 2, 0) / 15), e);
        node.opacity = Scalar.lerp(1, 0.1, Scalar.clamp(t, 0, 1));

        this._tileNodes.get(tileKey, () => {
            this.add(node);
            return node;
        });

        // update interval labels for this tile
        // find all visible intervals that are large enough to have labels
        if (this.intervalLabels) {
            let intervals = tile.payload.intervals;
            let nIntervals = tile.payload.intervals.length * 0.5;

            const trackWidthPx = this.getComputedWidth();

            for (let i = 0; i < nIntervals; i++) {
                let startIndex = intervals[i * 2];
                let intervalSpan = intervals[i * 2 + 1];
                let endIndex = startIndex + intervalSpan;

                // skip out of range
                if (endIndex < this.x0) continue;
                if (startIndex > this.x1) continue;

                let displaySize = (intervalSpan / span) * trackWidthPx;

                if (displaySize < this.labelWidthThresholdPx) continue;

                // interval is visible and wide enough to be interactive
                let key = this.intervalLabelKey(tile, i, startIndex, endIndex);
                let intervalLabel = this._labels.get(key, () => this.createLabel(tile, i));

                intervalLabel.relativeX = (startIndex - this.x0) / span;
                intervalLabel.relativeW = intervalSpan / span;
            }
        }

        return node;
    }

    protected intervalLabelKey(tile: Tile<IntervalTilePayload>, index: number, startIndex: number, endIndex: number) {
        return startIndex + ':' + endIndex;
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
        instancesTile.additiveBlending = 0.8; // nearly full additive
        instancesTile.y = 0;
        instancesTile.mask = this;
        instancesTile.relativeH = 1;

        return instancesTile;
    }

    protected removeTileNode = (tile: IntervalInstances) => {
        this.remove(tile);
    }

    protected createInstance(tilePayload: IntervalTilePayload, intervalIndex: number, relativeX: number, relativeW: number): IntervalInstance {
        return {
            x: 0,
            y: this.yPadding,
            z: 0,
            w: 0,
            h: - 2 * this.yPadding,
            relativeX: relativeX,
            relativeY: 0,
            relativeW: relativeW,
            relativeH: 1.0,
            color: this.intervalColor,
        };
    }

    protected createLabel(tile: Tile<IntervalTilePayload>, index: number) {
        let label = new IntervalTrackLabel('');
        label.relativeH = 1;
        label.y = this.yPadding;
        label.h = -this.yPadding;
        label.z = 5;
        label.setMask(this);

        this.add(label);
        return label;
    }

    protected removeLabel = (label: IntervalTrackLabel) => {
        this.remove(label);
        label.releaseGPUResources();
    }

}

export class IntervalTrackLabel extends Rect {

    protected textContainer: Object2D;
    protected text: Text;

    set string(v: string) {
        this.text.string = v;
    }

    get string() {
        return this.text.string;
    }

    constructor(string?: string) {
        super(0, 0, [1, 1, 1, 1]);
        this.opacity = 0;
        this.additiveBlending = 1; // full additive blending

        // add text
        this.text = new Text(MadaRegular, string + '', 1, [1, 1, 1, 1]);
        this.text.additiveBlending = 1.0;
        this.text.originX = -0.5;
        this.text.originY = -0.5;

        // we use a textContainer node to enabling finely scaling text
        this.textContainer = new Object2D()
        this.textContainer.relativeX = 0.5;
        this.textContainer.relativeY = 0.5;
        this.textContainer.add(this.text);

        this.add(this.textContainer);
    }

    setMask(mask: Renderable<any>) {
        this.mask = mask;
        this.text.mask = mask;
    }

    applyTransformToSubNodes(root?: boolean) {
        // when this object's transform is computed update text display
        let width = this.getComputedWidth();

        const maxTextSize = 16;
        const minTextSize = 5;
        const padding = 3;
        const maxOpacity = 0.7;

        let textSizePx = Math.min(width - padding, maxTextSize);
        let textOpacity = Math.min(Math.max((textSizePx - minTextSize) / (maxTextSize - minTextSize), 0.0), 1.0) * maxOpacity;
        textOpacity = textOpacity * textOpacity;

        this.textContainer.sx = this.textContainer.sy = textSizePx;
        this.text.opacity = textOpacity;

        super.applyTransformToSubNodes(root);
    }


    releaseGPUResources() {
        super.releaseGPUResources();
        this.text.releaseGPUResources();
    }

}

export default IntervalTrack;