import GPUDevice, { GPUTexture } from "engine/rendering/GPUDevice";
import TileCache, { Tile } from "../TileCache";
import { SequenceTrackModel } from "./SequenceTrackModel";
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
export declare class SequenceTileCache extends TileCache<TilePayload, BlockPayload> {
    protected model: SequenceTrackModel;
    protected contig: string;
    constructor(model: SequenceTrackModel, contig: string);
    protected mapLodLevel(l: number): number;
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
}
export default SequenceTileCache;
