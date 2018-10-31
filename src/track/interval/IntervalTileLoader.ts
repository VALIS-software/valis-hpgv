import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { IntervalTrackModel } from "./IntervalTrackModel";

type TilePayload = Float32Array;

/**
 * IntervalTileLoader makes it possible to transform a query result into tiles containing intervals
 *
 * It has two tile levels, micro and macro
 *
 * Micro tiles have lod 0 and are used to store intervals with base-pair precision
 *
 * Macro tile have lod level `this.macroLodLevel` and store many more intervals but with lower precision (not enough to display with base-pair precision)
 */
export class IntervalTileLoader extends TileLoader<TilePayload, void> {

    readonly microLodThreshold = 3;
    readonly macroLodLevel = 10;

    static cacheKey(model: IntervalTrackModel): string {
        return model.tileCacheType + ':' + JSON.stringify(model.query);
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

    protected mapLodLevel(l: number) {
        if (l <= this.microLodThreshold) {
            return 0;
        } else {
            return this.macroLodLevel;
        }
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        // @! quality improvement; reduce perception of shivering when zooming in
        // if lod level = 0 and a macro track exists that covers this tile then we can filter that tile to get the lod 0 tile (so no network request or promise)

        /*
        let startBase = tile.x + 1;
        let endBase = startBase + tile.span;

        return SiriusApi.getIntervalTrackData(this.contig, startBase, endBase, this.model.query).then((r) => {
            // allocate interval buffer
            let intervals = new Float32Array(r.data.length * 2);

            for (let i = 0; i < r.data.length; i++) {
                let entry = r.data[i];
                intervals[i * 2 + 0] = entry.start - 1;
                intervals[i * 2 + 1] = entry.length;
            }
            return intervals;
        });
        */
       console.warn('@! todo: load intervals');
       return new Float32Array(0);
    }

}

export default IntervalTileLoader;