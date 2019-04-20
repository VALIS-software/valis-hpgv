import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";
import { Contig } from "../..";

export type IntervalTilePayload = {
    intervals: Float32Array,

    userdata?: {
        [field: string]: any,
    }
};

/**
 * IntervalTileLoader makes it possible to transform a query result into tiles containing intervals
 *
 * It has two tile levels, micro and macro
 *
 * Micro tiles have lod 0 and are used to store intervals with base-pair precision
 *
 * Macro tile have lod level `this.macroLodLevel` and store many more intervals but with lower precision (not enough to display with base-pair precision)
 */
export class IntervalTileLoader extends TileLoader<IntervalTilePayload, void> {

    readonly microLodThreshold = 3;
    readonly macroLodLevel = 10;

    static cacheKey(model: IntervalTrackModel): string {
        return null;
    }

    static getAvailableContigs(model: IntervalTrackModel): Promise<Array<Contig>> {
        let contigs = new Array<Contig>();
        return Promise.resolve(contigs);
    }

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: IntervalTrackModel,
        protected readonly contig: string,
        tileSize = 1 << 15
    ) {
        super(
            tileSize, // tile size
            1
        );
    }

    mapLodLevel(l: number) {
        if (l <= this.microLodThreshold) {
            return 0;
        } else {
            return this.macroLodLevel;
        }
    }

    protected getTilePayload(tile: Tile<IntervalTilePayload>): Promise<IntervalTilePayload> | IntervalTilePayload {
        console.warn('Loading intervals from static files is not yet supported');
        return { intervals: new Float32Array(0) }
    }

}

export default IntervalTileLoader;