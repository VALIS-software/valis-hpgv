/// <reference types="node" />
import { EventEmitter } from "events";
/**
 * Base class for requesting and managing tiled data
 *
 * To use override the following methods in a subclass:
 * - `getTilePayload`
 * - `createBlockPayload`
 * - `releaseBlockPayload`
 * - `mapLodLevel`
 *
 * Tiles are organized into blocks for data storage efficiency (example, we may want to store many tiles into a single GPU texture 'block')
 */
export declare class TileLoader<TilePayload, BlockPayload> {
    readonly tileWidth: number;
    readonly tilesPerBlock: number;
    maximumX: number;
    protected lods: Blocks<TilePayload, BlockPayload>[];
    protected readonly blockSize: number;
    constructor(tileWidth?: number, tilesPerBlock?: number, maximumX?: number);
    getTiles(x0: number, x1: number, samplingDensity: number, requestData: boolean, callback: (tile: Tile<TilePayload>) => void): void;
    getTile(x: number, samplingDensity: number, requestData: boolean): Tile<TilePayload>;
    isWithinInitializedLodRange(samplingDensity: number): boolean;
    getBlockPayload(tile: Tile<TilePayload>): BlockPayload;
    clear(): void;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
    protected createBlockPayload(lodLevel: number, lodX: number, lodSpan: number, rows: number): BlockPayload;
    protected releaseBlockPayload(block: BlockPayload): void;
    protected mapLodLevel(selectedLodLevel: number): number;
    private getTileFromLodX;
    private loadTilePayload;
    private tileLoadComplete;
    private tileLoadFailed;
    private getBlock;
    private getBlocks;
    private tileRowIndex;
    private blockIndex;
    private blockId;
}
declare type Blocks<TilePayload, BlockPayload> = {
    [blockId: string]: Block<TilePayload, BlockPayload>;
};
export declare type Block<TilePayload, BlockPayload> = {
    lastUsedTimestamp: number;
    rows: Array<Tile<TilePayload>>;
    payload: BlockPayload;
};
export declare enum TileState {
    Empty = 0,
    Loading = 1,
    Complete = 2
}
export interface TileEventMap<Payload> {
    'complete': (tile: Tile<Payload>, payload: Payload) => void;
    'load-failed': (tile: Tile<Payload>, reason: string) => void;
}
export declare class Tile<Payload> {
    readonly block: Block<Payload, any>;
    readonly lodLevel: number;
    readonly lodX: number;
    readonly lodSpan: number;
    readonly blockRowIndex: number;
    state: TileState;
    payload: Payload | null;
    readonly x: number;
    readonly span: number;
    readonly key: string;
    protected _state: TileState;
    protected _payload: Payload;
    protected eventEmitter: EventEmitter;
    constructor(block: Block<Payload, any>, lodLevel: number, lodX: number, lodSpan: number, blockRowIndex: number);
    addEventListener<EventName extends keyof TileEventMap<Payload>>(event: EventName, callback: TileEventMap<Payload>[EventName]): void;
    removeEventListener<EventName extends keyof TileEventMap<Payload>>(event: EventName, callback: TileEventMap<Payload>[EventName]): void;
    markLastUsed(): void;
    protected emitComplete(): void;
    protected emitLoadFailed(reason: string): void;
}
export default TileLoader;
