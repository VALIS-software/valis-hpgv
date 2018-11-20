import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from "./AnnotationTrackModel";
import { GeneInfo, TranscriptComponentInfo, TranscriptInfo } from "./AnnotationTypes";
export declare type Gene = GeneInfo & {
    transcripts: Array<Transcript>;
};
export declare type Transcript = TranscriptInfo & {
    exon: Array<TranscriptComponentInfo>;
    cds: Array<TranscriptComponentInfo>;
    utr: Array<TranscriptComponentInfo>;
    other: Array<TranscriptComponentInfo>;
};
declare type TilePayload = Array<Gene>;
export declare class AnnotationTileLoader extends TileLoader<TilePayload, void> {
    protected readonly dataSource: IDataSource;
    protected readonly model: AnnotationTrackModel;
    protected readonly contig: string;
    protected macro: boolean;
    static cacheKey(model: AnnotationTrackModel): string;
    constructor(dataSource: IDataSource, model: AnnotationTrackModel, contig: string, tileSize?: number);
    mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
    static loadAnnotations(path: string, contig: string, startBaseIndex: number, span: number, macro: boolean): Promise<TilePayload>;
}
export declare class MacroAnnotationTileLoader extends TileLoader<TilePayload, void> {
    protected readonly dataSource: IDataSource;
    protected readonly model: MacroAnnotationTrackModel;
    protected readonly contig: string;
    protected annotationCache: AnnotationTileLoader;
    static cacheKey(model: MacroAnnotationTrackModel): string;
    constructor(dataSource: IDataSource, model: MacroAnnotationTrackModel, contig: string, tileSize?: number);
    mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default AnnotationTileLoader;
