import UsageCache from "engine/ds/UsageCache";
import { Object2D } from "engine/ui/Object2D";
import IntervalInstances from "../../ui/util/IntervalInstances";
import { Tile } from "../TileCache";
import TrackObject from "../TrackObject";
import IntervalTileCache from "./IntervalTileCache";
import { IntervalTrackModel } from "./IntervalTrackModel";
declare type TilePayload = Float32Array;
export declare class IntervalTrack extends TrackObject<IntervalTrackModel, IntervalTileCache> {
    blendEnabled: boolean;
    constructor(model: IntervalTrackModel);
    setBlendMode(enabled: boolean): void;
    protected _pendingTiles: UsageCache<Tile<any>>;
    protected _intervalTileCache: UsageCache<IntervalInstances>;
    protected _onStage: UsageCache<Object2D>;
    protected updateDisplay(): void;
    protected displayTileNode(tile: Tile<TilePayload>, z: number, x0: number, span: number, continuousLodLevel: number): void;
    protected createTileNode(tile: Tile<TilePayload>): IntervalInstances;
    protected removeTile: (tile: IntervalInstances) => void;
}
export default IntervalTrack;
