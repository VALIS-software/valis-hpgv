import UsageCache from "engine/ds/UsageCache";
import { Object2D } from "engine/ui/Object2D";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { Tile } from "../TileLoader";
import TrackObject from "../TrackObject";
import IntervalTileLoader, { IntervalTilePayload } from "./IntervalTileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";
export declare class IntervalTrack<Model extends IntervalTrackModel = IntervalTrackModel> extends TrackObject<Model, IntervalTileLoader> {
    readonly intervalColor: number[];
    constructor(model: Model);
    protected _pendingTiles: UsageCache<Tile<any>>;
    protected _intervalTileCache: UsageCache<IntervalInstances>;
    protected _onStage: UsageCache<Object2D>;
    protected updateDisplay(): void;
    protected displayTileNode(tile: Tile<IntervalTilePayload>, z: number, x0: number, span: number, continuousLodLevel: number): IntervalInstances;
    protected createTileNode(tile: Tile<IntervalTilePayload>): IntervalInstances;
    protected createInstance(tilePayload: IntervalTilePayload, intervalIndex: number, relativeX: number, relativeW: number): IntervalInstance;
    protected removeTile: (tile: IntervalInstances) => void;
}
export default IntervalTrack;
