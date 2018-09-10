import { Tile, TileStore } from "./TileStore";
import { SiriusApi } from "sirius/SiriusApi";
import QueryBuilder from "sirius/QueryBuilder";

export type TilePayload = Float32Array;

/**
 * GenericIntervalTileStore makes it possible to transform a query result into tiles containing intervals
 *
 * It has two tile levels, micro and macro
 *
 * Micro tiles have lod 0 and are used to store intervals with base-pair precision
 *
 * Macro tile have lod level `this.macroLodLevel` and store many more intervals but with lower precision (not enough to display with base-pair precision)
 */
export default class GenericIntervalTileStore extends TileStore<TilePayload, void> {

    microLodThreshold = 3;
    macroLodLevel = 10;

    constructor(
        protected contig: string,
        protected query: any,
        protected tileSize = 1 << 15
    ) {
        super(
            tileSize, // tile size
            1
        );

        SiriusApi.getContigInfo(contig).then((info) => {
            this.maximumX = info.length - 1;
        });
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

        let startBase = tile.x + 1;
        let endBase = startBase + tile.span;

        return SiriusApi.getIntervalTrackData(this.contig, startBase, endBase, this.query).then((r) => {
            // allocate interval buffer
            let intervals = new Float32Array(r.data.length * 2);

            for (let i = 0; i < r.data.length; i++) {
                let entry = r.data[i];
                intervals[i * 2 + 0] = entry.start - 1;
                intervals[i * 2 + 1] = entry.length;
            }
            return intervals;
        });

    }

}