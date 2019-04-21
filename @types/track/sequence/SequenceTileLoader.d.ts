import GPUDevice, { GPUTexture } from "engine/rendering/GPUDevice";
import TileLoader, { Tile } from "../TileLoader";
import { SequenceTrackModel } from "./SequenceTrackModel";
import { IDataSource } from "../../data-source/IDataSource";
import { Contig } from "../..";
declare type TilePayload = {
    array: Uint8Array;
    sequenceMinMax: {
        min: number;
        max: number;
    };
    dataUploaded: boolean;
    getTexture(device: GPUDevice): GPUTexture;
};
declare type BlockPayload = {
    _gpuTexture: GPUTexture;
    getTexture(device: GPUDevice): GPUTexture;
};
export declare type SequenceTilePayload = TilePayload;
export declare class SequenceTileLoader extends TileLoader<TilePayload, BlockPayload> {
    protected readonly dataSource: IDataSource;
    protected readonly model: SequenceTrackModel;
    protected readonly contig: string;
    static cacheKey(model: SequenceTrackModel): string;
    static getAvailableContigs(model: SequenceTrackModel): Promise<Array<Contig>>;
    constructor(dataSource: IDataSource, model: SequenceTrackModel, contig: string);
    mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<{
        dataUploaded: boolean;
        getTexture(device: GPUDevice): GPUTexture;
        array: Uint8Array;
        sequenceMinMax: {
            min: number;
            max: number;
        };
        indicesPerBase: number;
    }>;
    protected createBlockPayload(lodLevel: number, lodX: number, tileWidth: number, rows: number): BlockPayload;
    protected releaseBlockPayload(payload: BlockPayload): void;
    private static minMaxCache;
    static loadACGTSequenceFromPath(path: string, contig: string, startBaseIndex: number, span: number, lodLevel: number): Promise<{
        array: Uint8Array;
        sequenceMinMax: {
            min: number;
            max: number;
        };
        indicesPerBase: number;
    }>;
    private static loadArray;
}
export default SequenceTileLoader;
