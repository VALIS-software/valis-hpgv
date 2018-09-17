import UsageCache from "engine/ds/UsageCache";
import GenericIntervalTileStore from "../../model/data-store/GenericIntervalTileStore";
import { Tile } from "../../model/data-store/TileStore";
import { TrackModel } from "../../model/TrackModel";
import { Object2D } from "engine/ui/Object2D";
import TrackObject from "./BaseTrack";
import IntervalInstances from "./util/IntervalInstances";
declare type TilePayload = Float32Array;
export declare class IntervalTrack extends TrackObject<'interval'> {
    blendEnabled: boolean;
    protected tileStore: GenericIntervalTileStore;
    constructor(model: TrackModel<'interval'>);
    setContig(contig: string): void;
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
