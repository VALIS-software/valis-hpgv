import GPUDevice, { GPUTexture } from "engine/rendering/GPUDevice";
import { SignalTrackModel } from "./SignalTrackModel";
import { BigWigReader, HeaderData } from "genomic-reader";
import { TileLoader, Tile } from "../TileLoader";
import { IDataSource } from "../../data-source/IDataSource";
import { Contig } from "../..";
export declare type SignalTilePayload = {
    textureUnpackMultiplier: number;
    array: Float32Array;
    sequenceMinMax: {
        min: number;
        max: number;
    };
    dataUploaded: boolean;
    getTexture(device: GPUDevice): GPUTexture;
    getReading(fractionalX: number, channel: number): number;
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
    protected bigWigLoader: BigWigLoader;
    protected readonly nChannels: number;
    static cacheKey(model: SignalTrackModel): string;
    static getAvailableContigs(model: SignalTrackModel): Promise<Array<Contig>>;
    static requestIndex: number;
    constructor(dataSource: IDataSource, model: SignalTrackModel, contig: string);
    mapLodLevel(l: number): number;
    /**
    * Executes callback on every tile value within the range x0 to x1 at a given lod (if the tile has loaded).
    * Successively higher lods are used to fill in missing gaps for tiles that have not yet loaded.
    * If there are no loaded tiles in this range the callback will not fire
    */
    forEachValue(x0: number, x1: number, lodLevel: number, coverGapsWithHigherLevels: boolean, callback: (x: number, r: number, g: number, b: number, a: number, lodLevel: number) => void): void;
    private _initializationPromise;
    protected initializationPromise(): Promise<void>;
    protected onReady(): void;
    /**
     * Generate a BigWig loader instance for a given BigWig file path
     */
    protected getBigWigLoader(path: string): Promise<BigWigLoader>;
    /**
     * Convert a BigWig zoom levels header into maps so we can lookup the zoom level for any given lod
     */
    protected generateLodLookups(bigWigHeader: HeaderData): {
        lodMap: Array<number>;
        lodZoomIndexMap: Array<number>;
    };
    /**
     * Given a BigWig loader instance, load BigWig data to cover *tile* into texture ArrayBuffer *buffer*.
     * Copies values into *targetChannel* assuming *nChannels* texture channels.
     */
    protected getBigWigData(bigWigLoader: BigWigLoader, tile: Tile<SignalTilePayload>, buffer: Float32Array, nChannels: number, targetChannel: number): Promise<Float32Array>;
    protected loadPayloadBuffer(tile: Tile<SignalTilePayload>): Promise<Float32Array>;
    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload>;
    protected createBlockPayload(lodLevel: number, lodX: number, tileWidth: number, rows: number): BlockPayload;
    protected releaseBlockPayload(payload: BlockPayload): void;
}
export {};
