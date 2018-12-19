import { IDataSource } from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { VariantTrackModel } from "./VariantTrackModel";
import Axios from "axios";

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
        if (this.model.path != null) {

            // vvariants-dir json file load
            let jsonPath = `${this.model.path}/${this.contig}/${tile.x},${tile.span}.json`;
            return Axios.get(jsonPath).then((a) => {
                return a.data;
            });
        }

        return [];
    }

}
export default VariantTileLoader;