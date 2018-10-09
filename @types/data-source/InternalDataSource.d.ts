import TileCache from '../track/TileCache';
import TrackModel from '../track/TrackModel';
import { IDataSource } from './IDataSource';
export declare class InternalDataSource implements IDataSource {
    protected readonly dataSource: IDataSource;
    protected tileCaches: {
        [type: string]: {
            [key: string]: TileCache<any, any>;
        };
    };
    constructor(dataSource: IDataSource);
    getContigs(): Promise<import("../model/Contig").Contig[]>;
    getTileCache(model: TrackModel, contig: string, differentiatingKey?: string): TileCache<any, any>;
    clearTileCache(type: string): void;
    clearTileCaches(): void;
}
export default InternalDataSource;
