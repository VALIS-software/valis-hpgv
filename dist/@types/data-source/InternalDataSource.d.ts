import TileLoader from '../track/TileLoader';
import TrackModel from '../track/TrackModel';
import { IDataSource } from './IDataSource';
export declare class InternalDataSource {
    protected readonly dataSource: IDataSource;
    protected tileCaches: {
        [type: string]: {
            [key: string]: TileLoader<any, any>;
        };
    };
    constructor(dataSource: IDataSource);
    getContigs(): Promise<import("../model/Contig").Contig[]>;
    getTileLoader(model: TrackModel, contig: string, differentiatingKey?: string): TileLoader<any, any>;
    clearTileCache(type: string): void;
    clearTileCaches(): void;
}
export default InternalDataSource;
