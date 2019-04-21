import TileLoader from '../track/TileLoader';
import TrackModel from '../track/TrackModel';
import { IDataSource } from './IDataSource';
import { Contig } from '..';
export declare class InternalDataSource {
    protected readonly dataSource: IDataSource;
    protected tileCaches: {
        [type: string]: {
            [contig: string]: TileLoader<any, any>;
        };
    };
    protected localContigs: Contig[];
    protected cachedContigs: Array<Contig>;
    constructor(dataSource: IDataSource);
    getContigs(): Promise<Contig[]>;
    getCachedContigs(): Array<Contig>;
    addContig(contig: Contig): void;
    removeContig(contig: Contig): void;
    getTileLoader(model: TrackModel, contig: string): TileLoader<any, any>;
    clearTileCache(type: string): void;
    clearTileCaches(): void;
}
export default InternalDataSource;
