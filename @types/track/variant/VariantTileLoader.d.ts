import { Tile, TileLoader } from "../TileLoader";
import { VariantTrackModel } from "./VariantTrackModel";
declare type TilePayload = Array<{
    id: string;
    baseIndex: number;
    refSequence: string;
    alts: string[];
}>;
export declare class VariantTileLoader extends TileLoader<TilePayload, void> {
    protected model: VariantTrackModel;
    protected contig: string;
    constructor(model: VariantTrackModel, contig: string);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default VariantTileLoader;
