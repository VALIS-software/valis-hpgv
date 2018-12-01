import GPUDevice, { GPUTexture } from "engine/rendering/GPUDevice";
import { SignalTrackModel } from "./SignalTrackModel";
import { BigWigReader, HeaderData } from "bigwig-reader";
import { TileLoader, Tile } from "../TileLoader";
import { IDataSource } from "../../data-source/IDataSource";
export declare type SignalTilePayload = {
    array: Float32Array;
    sequenceMinMax: {
        min: number;
        max: number;
    };
    dataUploaded: boolean;
    getTexture(device: GPUDevice): GPUTexture;
    getReading(fractionalX: number): number;
};
declare type BlockPayload = {
    _gpuTexture: GPUTexture;
    floatPacking: boolean;
    getTexture(device: GPUDevice): GPUTexture;
};
declare type BigWigLoader = {
    header: HeaderData;
    reader: BigWigReader;
    lodMap: Array<number>;
    lodZoomIndexMap: Array<number | null>;
};
export declare class SignalTileLoader extends TileLoader<SignalTilePayload, BlockPayload> {
    protected readonly dataSource: IDataSource;
    protected readonly model: SignalTrackModel;
    protected readonly contig: string;
    ready: boolean;
    readonly scaleFactor: number;
    protected bigWigLoader: BigWigLoader;
    protected _scaleFactor: number;
    protected _logarithmicDisplay: boolean;
    static cacheKey(model: SignalTrackModel): string;
    static requestIndex: number;
    constructor(dataSource: IDataSource, model: SignalTrackModel, contig: string);
    mapLodLevel(l: number): number;
    protected _initializationPromise: Promise<void>;
    protected initializationPromise(): Promise<void>;
    protected onReady(): void;
    protected getBigWigLoader(path: string): Promise<BigWigLoader>;
    protected generateLodLookups(bigWigHeader: HeaderData): {
        lodMap: Array<number>;
        lodZoomIndexMap: Array<number>;
    };
    protected getBigWigData(bigWigLoader: BigWigLoader, tile: Tile<SignalTilePayload>, buffer: Float32Array, nChannels: number, offset: number): Promise<Float32Array>;
    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload>;
    protected createBlockPayload(lodLevel: number, lodX: number, tileWidth: number, rows: number): BlockPayload;
    protected releaseBlockPayload(payload: BlockPayload): void;
}
export {};
