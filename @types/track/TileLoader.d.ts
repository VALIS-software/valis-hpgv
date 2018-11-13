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
    protected requestManager: TileRequestManager;
    constructor(tileWidth?: number, tilesPerBlock?: number, maximumX?: number);
    /**
     * Callback is executed synchronously
     */
    forEachTile(x0: number, x1: number, samplingDensity: number, loadEmptyTiles: boolean, callback: (tile: Tile<TilePayload>) => void): void;
    /**
     * Callback is executed synchronously
     */
    forEachTileAtLod(x0: number, x1: number, lodLevel: number, loadEmptyTiles: boolean, callback: (tile: Tile<TilePayload>) => void): void;
    getTile(x: number, samplingDensity: number, loadEmptyTiles: boolean): Tile<TilePayload>;
    getTileAtLod(x: number, lodLevel: number, loadEmptyTiles: boolean): Tile<TilePayload>;
    isWithinInitializedLodRange(samplingDensity: number): boolean;
    getBlockPayload(tile: Tile<TilePayload>): BlockPayload;
    clear(): void;
    topTouchedLod(): number;
    mapLodLevel(selectedLodLevel: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
    protected createBlockPayload(lodLevel: number, lodX: number, lodSpan: number, rows: number): BlockPayload;
    protected releaseBlockPayload(block: BlockPayload): void;
    /**
     * Request tile if not requested, if tile loading then bump priority
     */
    private touchTileRequest;
    private getTileFromLodX;
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
/**
 * # Tile Request Manager
 *
 * If a user is navigating around then many requests may be started but the most recently started request are the highest priority as these correspond to regions currently visible
 * Once a browser request has been created we cannot deprioritise it if we decide a new request should take precedence. To work around this we create a request stack (that's dequeued
 * in order of the most recently enqueued).
 *
 * The manager allows a small number of concurrent requests (a limitation also provided by the browser), when request finishes and slot opens up, the executed request is the one
 * most recently pushed to the stack.
 *
 * If request management is done at a global level so it potentially includes requests made by other genome browsers active at the same time.
 */
declare class TileRequestManager {
    maxActiveRequests: number;
    private requestStack;
    private activeRequests;
    constructor(maxActiveRequests?: number);
    loadTile(tile: Tile<any>, requestPayload: (tile: Tile<any>) => Promise<any> | any): void;
    removeFromQueue(tile: Tile<any>): void;
    bringToFrontOfQueue(tile: Tile<any>): void;
    private tryLoadTile;
    private tileLoadComplete;
    private tileLoadFailed;
    private tileLoadEnd;
}
export default TileLoader;
