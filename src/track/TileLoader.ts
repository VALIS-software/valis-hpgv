import Scalar from "engine/math/Scalar";
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
export class TileLoader<TilePayload, BlockPayload> {

    // cached tile data
    protected lods = new Array<Blocks<TilePayload, BlockPayload>>();
    protected readonly blockSize: number;
    protected requestManager = new TileRequestManager(4);

    constructor(
        readonly tileWidth: number = 1024,
        readonly tilesPerBlock: number = 8,
        public maximumX: number = Infinity,
    ) {
        this.blockSize = tileWidth * tilesPerBlock;
    }
    
    /**
     * Callback is executed synchronously
     */
    forEachTile(
        x0: number,
        x1: number,
        samplingDensity: number,
        loadEmptyTiles: boolean,
        callback: (tile: Tile<TilePayload>) => void
    ) {
        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);

        return this.forEachTileAtLod(x0, x1, lodLevel, loadEmptyTiles, callback);
    }
    
    /**
     * Callback is executed synchronously
     */
    forEachTileAtLod(
        x0: number,
        x1: number,
        lodLevel: number,
        loadEmptyTiles: boolean,
        callback: (tile: Tile<TilePayload>) => void
    ) {
        // clamp to positive numbers
        x0 = Math.max(x0, 0);
        x1 = Math.max(x1, 0);

        // apply max X
        x0 = Math.min(x0, this.maximumX);
        x1 = Math.min(x1, this.maximumX);

        // guard illegal span
        if (x1 <= x0) return;

        lodLevel = this.mapLodLevel(lodLevel);

        // convert range (at lod 0) to map to the current lod level (and round up/down greedily)
        let lodDensity = Math.pow(2, lodLevel);
        let x0_lodSpace = Math.floor(x0 / lodDensity);
        let x1_lodSpace = Math.ceil(x1 / lodDensity);

        // find the block and row within the block that overlaps x0 and x1
        let block0 = this.blockIndex(x0_lodSpace);
        let tileRow0 = this.tileRowIndex(x0_lodSpace);

        let block1 = this.blockIndex(x1_lodSpace);
        let tileRow1 = this.tileRowIndex(x1_lodSpace);

        // iterate over all blocks which intersect the range (creating blocks when they don't exist)
        // request data for each 'tile row' (aka a row of data in a block that corresponds to a single tile)
        // fire callback for each tile instance
        for (let blockIndex = block0; blockIndex <= block1; blockIndex++) {
            let block = this.getBlock(lodLevel, blockIndex);

            let firstRowIndex = blockIndex === block0 ? tileRow0 : 0;
            let lastRowIndex = blockIndex === block1 ? tileRow1 : (this.tilesPerBlock - 1);

            for (let rowIndex = firstRowIndex; rowIndex <= lastRowIndex; rowIndex++) {
                let tile = block.rows[rowIndex];

                if (loadEmptyTiles) {
                    this.touchTileRequest(tile);
                }

                callback(tile);
            }
        }
    }

    getTile(
        x: number,
        samplingDensity: number,
        loadEmptyTiles: boolean
    ): Tile<TilePayload> {
        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);

        return this.getTileAtLod(x, lodLevel, loadEmptyTiles);
    }

    getTileAtLod(
        x: number,
        lodLevel: number,
        loadEmptyTiles: boolean
    ): Tile<TilePayload> {
        x = Math.max(x, 0);
        x = Math.min(x, this.maximumX);
        
        lodLevel = this.mapLodLevel(lodLevel);

        let lodDensity = Math.pow(2, lodLevel);
        let x_lodSpace = Math.floor(x / lodDensity);

        let tile = this.getTileFromLodX(lodLevel, x_lodSpace, loadEmptyTiles);

        if (loadEmptyTiles) {
            this.touchTileRequest(tile);
        }

        return tile;
    }

    isWithinInitializedLodRange(samplingDensity: number) {
        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);
        lodLevel = this.mapLodLevel(lodLevel);
        return lodLevel >= 0 && lodLevel < this.lods.length;
    }

    getBlockPayload(tile: Tile<TilePayload>) {
        let blockLodX = this.blockIndex(tile.lodX);
        let block = this.getBlock(tile.lodLevel, blockLodX);
        if (block.payload == null) {
            block.payload = this.createBlockPayload(tile.lodLevel, blockLodX, this.tileWidth, this.tilesPerBlock);
        }
        return block.payload;
    }

    clear() {
        // release block payloads
        for (let lod of this.lods) {
            for (let blockId in lod) {
                let block = lod[blockId];
                if (block === undefined || block.payload == null) {
                    continue;
                }
                this.releaseBlockPayload(block.payload);
            }
        }
        // release tiles to GC
        this.lods = new Array();
    }

    topTouchedLod() {
        return this.lods.length - 1;
    }

    // user-overridden methods
    mapLodLevel(selectedLodLevel: number): number {
        return selectedLodLevel;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        return null;
    }

    protected createBlockPayload(lodLevel: number, lodX: number, lodSpan: number, rows: number): BlockPayload {
        return null;
    }

    protected releaseBlockPayload(block: BlockPayload): void {

    }

    /**
     * Request tile if not requested, if tile loading then bump priority
     */
    private touchTileRequest(tile: Tile<TilePayload>) {
        if (tile.state === TileState.Empty) {
            // no data requests have been made yet for this tile
            this.requestManager.loadTile(tile, (tile) => this.getTilePayload(tile));
        } else if (tile.state === TileState.Loading) {
            this.requestManager.bringToFrontOfQueue(tile);
        }
    }

    private getTileFromLodX(
        lodLevel: number,
        lodX: number,
        requestData: boolean
    ): Tile<TilePayload> {
        let blockIndex = this.blockIndex(lodX);
        let rowIndex = this.tileRowIndex(lodX);

        let block = this.getBlock(lodLevel, blockIndex);

        let tile = block.rows[rowIndex];

        return tile;
    }

    private getBlock(lodLevel: number, blockIndex: number) {
        let blocks = this.getBlocks(lodLevel);
        let blockId = this.blockId(blockIndex);
        let block = blocks[blockId];

        if (block === undefined) {
            // create block
            block = {
                lastUsedTimestamp: -1, // never used
                rows: new Array(this.tilesPerBlock),
                payload: null,
            }

            let blockLodX = blockIndex * this.blockSize;

            // initialize empty tile data objects for each row
            for (let rowIndex = 0; rowIndex < this.tilesPerBlock; rowIndex++) {
                // tile (lodLevel, blockIndex, rowIndex)
                let tileLodX = rowIndex * this.tileWidth + blockLodX;
                block.rows[rowIndex] = new Tile(
                    block,
                    lodLevel,
                    tileLodX,
                    this.tileWidth,
                    rowIndex,
                );
            }

            // store in blocks
            blocks[blockId] = block;
        }

        return block;
    }

    private getBlocks(lod: number) {
        let blocks = this.lods[lod];
        if (blocks === undefined) {
            blocks = this.lods[lod] = {};
        }
        return blocks;
    }

    private tileRowIndex(lodX: number): number {
        return Math.floor((lodX % this.blockSize) / this.tileWidth);
    }

    private blockIndex(lodX: number): number {
        return Math.floor(lodX / this.blockSize);
    }

    private blockId(blockIndex: number): string {
        return blockIndex.toString();
    }

}

type Blocks<TilePayload, BlockPayload> = { [blockId: string]: Block<TilePayload, BlockPayload> }

export type Block<TilePayload, BlockPayload> = {
    lastUsedTimestamp: number,
    rows: Array<Tile<TilePayload>>,
    payload: BlockPayload
}

export enum TileState {
    Empty = 0,
    Loading = 1,
    Complete = 2,
}

export interface TileEventMap<Payload> {
    'complete': (tile: Tile<Payload>, payload: Payload) => void;
    'load-failed': (tile: Tile<Payload>, reason: string) => void;
}

type TileInternal<Payload> = {
    _state: TileState;
    _payload: Payload;
    emitComplete(): void;
    emitLoadFailed(reason: string): void;
}

export class Tile<Payload> {

    set state(v) {}
    get state(): TileState {
        return this._state;
    }

    // available when tile is in the Complete state
    set payload(v) {}
    get payload(): Payload | null {
        return this._payload;
    }

    readonly x: number;
    readonly span: number;
    readonly key: string; // unique within a tile set

    protected _state: TileState = TileState.Empty;
    protected _payload: Payload;
    protected eventEmitter = new EventEmitter();

    constructor(
        readonly block: Block<Payload, any>,
        readonly lodLevel: number,
        readonly lodX: number,
        readonly lodSpan: number,
        readonly blockRowIndex: number
    ) {
        let lodDensity = Math.pow(2, lodLevel);
        this.x = lodX * lodDensity;
        this.span = lodSpan * lodDensity;

        this.key = this.lodLevel + '_' + this.lodX;
    }

    addEventListener<EventName extends keyof TileEventMap<Payload>>(event: EventName, callback: TileEventMap<Payload>[EventName]) {
        this.eventEmitter.addListener(event, callback);
    }

    removeEventListener<EventName extends keyof TileEventMap<Payload>>(event: EventName, callback: TileEventMap<Payload>[EventName]) {
        this.eventEmitter.removeListener(event, callback);
    }

    markLastUsed() {
        this.block.lastUsedTimestamp = performance.now();
    }

    protected emitComplete() {
        this.eventEmitter.emit('complete', this, this._payload);
    }

    protected emitLoadFailed(reason: string) {
        this.eventEmitter.emit('load-failed', this, reason);
    }

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
class TileRequestManager {

    // this is allowed be changed at runtime
    public maxActiveRequests: number;

    private requestStack = new Array<{
        tile: Tile<any>,
        requestPayload: (tile: Tile<any>) => Promise<any> | any
    }>();
    private activeRequests = 0;

    constructor(maxActiveRequests = 4) {
        this.maxActiveRequests = maxActiveRequests;
    }

    public loadTile(
        tile: Tile<any>,
        requestPayload: (tile: Tile<any>) => Promise<any> | any
    ) {
        // console.log('Requesting tile', tile.key, TileState[tile.state]);

        if (tile.state !== TileState.Empty) {
            console.warn(`Tile loading was requested when state was "${TileState[tile.state]} (${tile.state})" and not "Empty"`);
            return;
        }

        this.tryLoadTile(tile, requestPayload);
    }

    public removeFromQueue(tile: Tile<any>) {
        let idx = this.requestStack.findIndex((e) => e.tile === tile);
        if (idx !== -1) {
            // console.log('%cTile removed from queue', 'color: orange; font-weight: bold');
            this.requestStack.splice(idx, 1);
        }

        if (tile.state === TileState.Loading) {
            let tileInternal = tile as any as TileInternal<any>;
            tileInternal._state = TileState.Empty;
        }
    }

    public bringToFrontOfQueue(tile: Tile<any>) {
        // if a request for tile is queued, bring it to the front
        let idx = this.requestStack.findIndex((e) => e.tile === tile);
        if ((idx !== -1) && (idx !== this.requestStack.length - 1)) {
            let entry = this.requestStack[idx];
            this.requestStack.splice(idx, 1);
            this.requestStack.push(entry);
        }
    }

    private tryLoadTile(
        tile: Tile<any>,
        requestPayload: (tile: Tile<any>) => Promise<any> | any
    ) {
        // is this tile already queued?
        // if so, remove it (and potentially re-queue it later)
        this.removeFromQueue(tile);

        // mark tile as in 'Loading' mode
        let tileInternal = tile as any as TileInternal<any>;
        tileInternal._state = TileState.Loading;

        // can we load the tile immediately or should we add it to the request queue
        if (this.activeRequests < this.maxActiveRequests) {
            this.activeRequests++;

            try {
                let result = requestPayload(tile);

                if (Promise.resolve(result) === result) {
                    // result is a promise
                    result
                        .then((payload: any) => this.tileLoadComplete(tile, payload))
                        .catch((reason: any) => this.tileLoadFailed(tile, reason));
                } else {
                    // assume result is the payload
                    this.tileLoadComplete(tile, result);
                }
            } catch (e) {
                this.tileLoadFailed(tile, e);
            }

        } else {
            // console.log('%cQueuing tile', 'color: purple; font-weight: bold', tile.key);
            // no free request slots at this time, add it to the queue
            this.requestStack.push({
                tile: tile,
                requestPayload: requestPayload
            });
        }
    }

    private tileLoadComplete(tile: Tile<any>, payload: any) {
        const tileInternal = tile as any as TileInternal<any>;
        tileInternal._payload = payload;
        tileInternal._state = TileState.Complete;
        tileInternal.emitComplete();
        this.tileLoadEnd(tile);
    }

    private tileLoadFailed(tile: Tile<any>, reason: any) {
        const tileInternal = tile as any as TileInternal<any>;
        tileInternal._state = TileState.Empty;
        tileInternal.emitLoadFailed(reason);
        console.warn(`Tile payload request failed: ${reason}`, tile.key);
        this.tileLoadEnd(tile);
    }

    private tileLoadEnd(tile: Tile<any>) {
        this.activeRequests--;

        if (this.requestStack.length > 0) {
            let nextRequest = this.requestStack.pop();

            // console.log('%cPopping tile from queue', 'color: blue; font-weight: bold', nextRequest.tile.key);

            this.tryLoadTile(
                nextRequest.tile,
                nextRequest.requestPayload
            );
        }
    }

}

export default TileLoader;