import { Tile, TileStore } from "./TileStore";
declare type TilePayload = Float32Array;
/**
 * GenericIntervalTileStore makes it possible to transform a query result into tiles containing intervals
 *
 * It has two tile levels, micro and macro
 *
 * Micro tiles have lod 0 and are used to store intervals with base-pair precision
 *
 * Macro tile have lod level `this.macroLodLevel` and store many more intervals but with lower precision (not enough to display with base-pair precision)
 */
export default class GenericIntervalTileStore extends TileStore<TilePayload, void> {
    protected contig: string;
    protected query: any;
    protected tileSize: number;
    microLodThreshold: number;
    macroLodLevel: number;
    constructor(contig: string, query: any, tileSize?: number);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export {};
