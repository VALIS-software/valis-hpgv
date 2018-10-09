import { IDataSource } from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { VariantTrackModel } from "./VariantTrackModel";
declare type TilePayload = Array<{
    id: string;
    baseIndex: number;
    refSequence: string;
    alts: string[];
}>;
export declare class VariantTileLoader extends TileLoader<TilePayload, void> {
    protected readonly dataSource: IDataSource;
    protected readonly model: VariantTrackModel;
    protected readonly contig: string;
    constructor(dataSource: IDataSource, model: VariantTrackModel, contig: string);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default VariantTileLoader;
