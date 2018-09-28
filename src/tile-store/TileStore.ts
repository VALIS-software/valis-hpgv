import { EventEmitter } from "events";
import Scalar from "engine/math/Scalar";

export class TileStore<TilePayload, BlockPayload> {

    protected lods = new Array<Blocks<TilePayload, BlockPayload>>();
    protected readonly blockSize: number;

    constructor(
        readonly tileWidth: number = 1024,
        readonly tilesPerBlock: number = 8,
        public maximumX: number = Infinity,
    ) {
        this.blockSize = tileWidth * tilesPerBlock;
    }

    getTiles(
        x0: number,
        x1: number,
        samplingDensity: number,
        requestData: boolean,
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

        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);

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

                if (requestData && (tile.state === TileState.Empty)) {
                    // no data requests have been made yet for this tile
                    this.loadTilePayload(tile);
                }

                callback(tile);
            }
        }
    }

    getTile(
        x: number,
        samplingDensity: number,
        requestData: boolean
    ): Tile<TilePayload> {
        x = Math.max(x, 0);
        x = Math.min(x, this.maximumX);

        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);

        lodLevel = this.mapLodLevel(lodLevel);

        let lodDensity = Math.pow(2, lodLevel);
        let x_lodSpace = Math.floor(x / lodDensity);

        return this.getTileFromLodX(lodLevel, x_lodSpace, requestData);
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
                if (block === undefined || block.payload === undefined) {
                    continue;
                }
                this.releaseBlockPayload(block.payload);
            }
        }
        // release tiles to GC
        this.lods = new Array();
    }

    // user-overridden methods
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        return null;
    }

    protected createBlockPayload(lodLevel: number, lodX: number, lodSpan: number, rows: number): BlockPayload {
        return null;
    }

    protected releaseBlockPayload(block: BlockPayload): void {
        
    }

    protected mapLodLevel(selectedLodLevel: number): number {
        return selectedLodLevel;
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

        if (requestData && (tile.state === TileState.Empty)) {
            this.loadTilePayload(tile);
        }

        return tile;
    }

    private loadTilePayload(tile: Tile<TilePayload>) {
        const tileInternal = tile as any as TileInternal<TilePayload>;

        tileInternal._state = TileState.Loading;

        try {
            let result = this.getTilePayload(tile);

            if (Promise.resolve(result) === result) {
                // result is a promise
                result
                    .then((payload) => this.tileLoadComplete(tile, payload))
                    .catch((reason) => this.tileLoadFailed(tile, reason));
            } else {
                // assume result is the payload
                this.tileLoadComplete(tile, result as TilePayload);
            }
        } catch(e) {
            this.tileLoadFailed(tile, e);
        }
    }

    private tileLoadComplete(tile: Tile<TilePayload>, payload: TilePayload) {
        const tileInternal = tile as any as TileInternal<TilePayload>;
        tileInternal._payload = payload;
        tileInternal._state = TileState.Complete;
        tileInternal.emitComplete();
    }

    private tileLoadFailed(tile: Tile<TilePayload>, reason: any) {
        const tileInternal = tile as any as TileInternal<TilePayload>;
        tileInternal._state = TileState.Empty;
        tileInternal.emitLoadFailed(reason);
        console.warn(`Tile payload request failed: ${reason}`, tile);
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

export default TileStore;