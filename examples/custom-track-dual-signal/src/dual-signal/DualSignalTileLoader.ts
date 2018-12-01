import { TileLoader, IDataSource } from 'genome-visualizer';
import { DualSignalTrackModel } from './DualSignalTrackModel';

export class DualSignalTileLoader extends TileLoader<null, null> {

    static cacheKey(model: DualSignalTrackModel) {
        return model.path + '\x1f' + model.path2;
    }

    constructor(dataSource: IDataSource, model: DualSignalTrackModel, contig: string, ...args: Array<any>) {
        super();
    }

}