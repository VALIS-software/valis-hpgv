import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { GeneInfo, TranscriptComponentInfo, TranscriptInfo } from "./AnnotationTypes";
import TrackModel from "../TrackModel";
import { BigLoader } from "../../formats";
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
declare enum AnnotationFormat {
    ValisGenes = 0,
    BigBed = 1
}
export declare class AnnotationTileLoader extends TileLoader<TilePayload, void> {
    protected readonly dataSource: IDataSource;
    protected readonly model: TrackModel;
    protected readonly contig: string;
    protected annotationFileFormat?: AnnotationFormat;
    readonly macroLod: number;
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    static cacheKey(model: TrackModel): string;
    constructor(dataSource: IDataSource, model: TrackModel, contig: string, tileSize?: number);
    mapLodLevel(l: number): 0 | 5;
    protected _bigLoaderPromise: Promise<BigLoader>;
    protected getBigLoader(): Promise<BigLoader>;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
    static loadValisGenesAnnotations(path: string, contig: string, startBaseIndex: number, span: number, macro: boolean): Promise<TilePayload>;
}
export default AnnotationTileLoader;
