import { GenomeBrowser } from '../GenomeBrowser';
import TileLoader from '../track/TileLoader';
import TrackModel from '../track/TrackModel';
import { IDataSource } from './IDataSource';

export class InternalDataSource {

    protected tileCaches: {
        [type: string]: {
            [key: string]: TileLoader<any, any>
        }
    } = {};

    constructor(protected readonly dataSource: IDataSource) {
    }

    getContigs() {
        return this.dataSource.getContigs();
    }

    getTileLoader(model: TrackModel, contig: string, differentiatingKey?: string): TileLoader<any, any> {
        let type = model.type;
        let key = contig;

        if (differentiatingKey != null) {
            key += '\x1f' + differentiatingKey;
        }
        
        let tileCaches = this.tileCaches[type];
        if (tileCaches === undefined) {
            this.tileCaches[type] = tileCaches = {};
        }

        let tileLoader = tileCaches[key];
        if (tileLoader === undefined) {

            let trackDescriptor = GenomeBrowser.getTrackType(type);
            tileCaches[key] = tileLoader = new trackDescriptor.tileLoaderClass(this.dataSource, model, contig);

            // set maximumX when we have access to contig info
            this.dataSource.getContigs().then((contigInfoArray) => {
                let matchingContigInfo = contigInfoArray.find((c) => c.id === key);

                if (matchingContigInfo != null) {
                    tileLoader.maximumX = matchingContigInfo.span - 1;

                    // preload low-resolution data
                    // @! needs to be validated and tested that this works as expected
                    /*
                    let minSpan = 512;
                    tileLoader.getTiles(0, tileLoader.maximumX, matchingContigInfo.span / minSpan, true, () => { });
                    */
                }
            });
        }

        return tileLoader;
    }

    clearTileCache(type: string) {
        let tileCaches = this.tileCaches[type];
        if (tileCaches === undefined) return;

        for (let key in tileCaches) {
            let tileCache = tileCaches[key];
            tileCache.clear();
        }

        delete this.tileCaches[type];
    }

    clearTileCaches() {
        for (let type in this.tileCaches) {
            this.clearTileCache(type);
        }
    }

}

export default InternalDataSource;