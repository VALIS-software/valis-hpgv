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

    mapLodLevel(l: number) {
        if (this.model.query == null) {
            return 0;
        }

        return Math.floor(l / 10) * 10;
    }

    protected getTilePayload(tile: Tile<VariantTilePayload>): Promise<VariantTilePayload> | VariantTilePayload {
        console.warn('Loading variants from static files is not yet supported');
        return [];
    }

}
export default VariantTileLoader;