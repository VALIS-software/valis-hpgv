import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";
export declare type IntervalTilePayload = {
    intervals: Float32Array;
    userdata?: {
        [field: string]: any;
    };
};
/**
 * IntervalTileLoader makes it possible to transform a query result into tiles containing intervals
 *
 * It has two tile levels, micro and macro
 *
 * Micro tiles have lod 0 and are used to store intervals with base-pair precision
 *
 * Macro tile have lod level `this.macroLodLevel` and store many more intervals but with lower precision (not enough to display with base-pair precision)
 */
export declare class IntervalTileLoader extends TileLoader<IntervalTilePayload, void> {
    protected readonly dataSource: IDataSource;
    protected readonly model: IntervalTrackModel;
    protected readonly contig: string;
    readonly microLodThreshold: number;
    readonly macroLodLevel: number;
    static cacheKey(model: IntervalTrackModel): string;
    constructor(dataSource: IDataSource, model: IntervalTrackModel, contig: string, tileSize?: number);
    protected mapLodLevel(l: number): 0 | 10;
    protected getTilePayload(tile: Tile<IntervalTilePayload>): Promise<IntervalTilePayload> | IntervalTilePayload;
}
export default IntervalTileLoader;
