import { TrackModel } from "../model/TrackModel";
import { Tile, TileStore } from "./TileStore";
declare type TilePayload = Array<{
    id: string;
    baseIndex: number;
    refSequence: string;
    alts: string[];
}>;
export declare class VariantTileStore extends TileStore<TilePayload, void> {
    protected model: TrackModel<'variant'>;
    protected contig: string;
    constructor(model: TrackModel<'variant'>, contig: string);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default VariantTileStore;
