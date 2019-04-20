import { GenomeVisualizer } from '../GenomeVisualizer';
import TileLoader from '../track/TileLoader';
import TrackModel from '../track/TrackModel';
import { IDataSource } from './IDataSource';
import { Contig } from '..';

export class InternalDataSource {

    protected tileCaches: {
        [type: string]: {
            [key: string]: TileLoader<any, any>
        }
    } = {};

    protected localContigs = new Array<Contig>();

    constructor(protected readonly dataSource: IDataSource) {
    }

    getContigs() {
        return this.dataSource.getContigs().then(contigs => contigs.concat(this.localContigs));
    }

    addContig(contig: Contig) {
        let existingContig = this.localContigs.find((c) => c.id === contig.id);
        if (existingContig == null) {
            this.localContigs.push(contig);
        } else {
            // expand existing contig
            existingContig.startIndex = Math.min(existingContig.startIndex, contig.startIndex);
            existingContig.span = Math.min(existingContig.span, contig.span);
            existingContig.name = existingContig.name || contig.name;
        }
    }

    removeContig(contig: Contig) {
        let i = this.localContigs.length - 1;
        while (i >= 0) {
            this.localContigs[i].id === contig.id;
            this.localContigs.splice(i, 1);
            i--;
        }
    }

    getTileLoader(model: TrackModel, contig: string): TileLoader<any, any> {
        let type = model.type;
        let key = contig;
        let trackTypeDescriptor = GenomeVisualizer.getTrackType(type);

        let differentiatingKey = trackTypeDescriptor.tileLoaderClass.cacheKey(model);

        if (differentiatingKey != null) {
            key += '\x1f' + differentiatingKey;
        }
        
        let tileCaches = this.tileCaches[type];
        if (tileCaches === undefined) {
            this.tileCaches[type] = tileCaches = {};
        }

        let tileLoader = tileCaches[key];
        if (tileLoader === undefined) {
            tileCaches[key] = tileLoader = new trackTypeDescriptor.tileLoaderClass(this.dataSource, model, contig);

            // set maximumX when we have access to contig info
            this.getContigs().then((contigInfoArray) => {
                let matchingContigInfo = contigInfoArray.find((c) => c.id === contig);
                if (matchingContigInfo != null) {
                    tileLoader.maximumX = matchingContigInfo.span - 1;
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