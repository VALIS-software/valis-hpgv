import GPUDevice, { GPUTexture } from "engine/rendering/GPUDevice";
import TileStore, { Tile } from "./TileStore";
export declare type TilePayload = {
    array: Uint8Array;
    sequenceMinMax: {
        min: number;
        max: number;
    };
    dataUploaded: boolean;
    getTexture(device: GPUDevice): GPUTexture;
};
export declare type BlockPayload = {
    _gpuTexture: GPUTexture;
    getTexture(device: GPUDevice): GPUTexture;
};
export declare class SequenceTileStore extends TileStore<TilePayload, BlockPayload> {
    protected sourceId: string;
    constructor(sourceId: string);
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
export default SequenceTileStore;
