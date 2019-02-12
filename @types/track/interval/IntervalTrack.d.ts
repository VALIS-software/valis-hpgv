import UsageCache from "engine/ds/UsageCache";
import { Object2D } from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { Tile } from "../TileLoader";
import TrackObject from "../TrackObject";
import IntervalTileLoader, { IntervalTilePayload } from "./IntervalTileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";
import { Rect } from "engine/ui/Rect";
import { Renderable } from "engine/rendering/Renderable";
export declare class IntervalTrack<Model extends IntervalTrackModel = IntervalTrackModel> extends TrackObject<Model, IntervalTileLoader> {
    protected intervalColor: number[];
    protected yPadding: number;
    protected intervalLabels: boolean;
    protected labelWidthThresholdPx: number;
    constructor(model: Model);
    protected _intervalTileCache: UsageCache<IntervalInstances>;
    protected _tileNodes: UsageCache<IntervalInstances>;
    protected _labels: UsageCache<IntervalTrackLabel>;
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
    protected displayTileNode(tile: Tile<IntervalTilePayload>, z: number, continuousLodLevel: number): IntervalInstances;
    protected intervalLabelKey(tile: Tile<IntervalTilePayload>, index: number, startIndex: number, endIndex: number): string;
    protected createTileNode(tile: Tile<IntervalTilePayload>): IntervalInstances;
    protected removeTileNode: (tile: IntervalInstances) => void;
    protected createInstance(tilePayload: IntervalTilePayload, intervalIndex: number, relativeX: number, relativeW: number): IntervalInstance;
    protected createLabel(tile: Tile<IntervalTilePayload>, index: number): IntervalTrackLabel;
    protected removeLabel: (label: IntervalTrackLabel) => void;
}
export declare class IntervalTrackLabel extends Rect {
    protected textContainer: Object2D;
    protected text: Text;
    string: string;
    constructor(string?: string);
    setMask(mask: Renderable<any>): void;
    applyTransformToSubNodes(root?: boolean): void;
    releaseGPUResources(): void;
}
export default IntervalTrack;
