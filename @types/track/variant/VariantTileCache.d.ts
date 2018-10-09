import { Tile, TileCache } from "../TileCache";
import { VariantTrackModel } from "./VariantTrackModel";
declare type TilePayload = Array<{
    id: string;
    baseIndex: number;
    refSequence: string;
    alts: string[];
}>;
export declare class VariantTileCache extends TileCache<TilePayload, void> {
    protected model: VariantTrackModel;
    protected contig: string;
    constructor(model: VariantTrackModel, contig: string);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default VariantTileCache;
