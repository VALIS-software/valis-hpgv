import { IDataSource } from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { VariantTrackModel } from "./VariantTrackModel";

export type VariantTilePayload = Array<{
    id: string,
    baseIndex: number,
    refSequence: string,
    alts: string[]
}>;

export class VariantTileLoader extends TileLoader<VariantTilePayload, void> {

    static cacheKey(model: VariantTrackModel) {
        return JSON.stringify(model.query);
    }

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: VariantTrackModel,
        protected readonly contig: string
    ) {
        super(
            1 << 15, // tile size
            1
        );
    }

    protected mapLodLevel(l: number) {
        if (this.model.query == null) {
            return 0;
        }

        return Math.floor(l / 10) * 10;
    }

    protected getTilePayload(tile: Tile<VariantTilePayload>): Promise<VariantTilePayload> | VariantTilePayload {
        /*
        const startBase = tile.x + 1;
        const endBase = startBase + tile.span;
        const snpQuery = this.model.query;
        let ApiPromise;
        if (!snpQuery) {
            // use special API created for the "all variants track"
            ApiPromise = SiriusApi.getAllVariantTrackData(this.contig, startBase, endBase);
        } else {
            ApiPromise = SiriusApi.getVariantTrackData(this.contig, startBase, endBase, snpQuery);
        }
        // use general API to load other variants, the number of results should be no more than 10M.
        return ApiPromise.then((data) => {
            let variants: Array<VariantGenomeNode> = data.data;
            return variants.map((v) => { return {
                id: v.id,
                baseIndex: v.start - 1,
                refSequence: v.info.variant_ref ? v.info.variant_ref: '',
                alts: v.info.variant_alt ? v.info.variant_alt.split(','): [],
            } });
        });
        */
        console.warn('@! todo: load variants');
        return [];
    }

}
export default VariantTileLoader;