import { IDataSource } from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { VariantTrackModel } from "./VariantTrackModel";
import Axios from "axios";
import { Contig } from "../..";

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

    static getAvailableContigs(model: VariantTrackModel): Promise<Array<Contig>> {
        let contigs = new Array<Contig>();
        if (model.path != null) {
            return Axios.get(model.path + '/manifest.json')
                .then((response) => {
                    // create a manifest that lists the available contigs
                    contigs = contigs.concat(response.data.contigs);
                })
                .catch((reason) => {
                    console.error(`Error loading manifest: ${reason}`);
                }).then(_ => contigs);
        }
        return Promise.resolve(contigs);
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