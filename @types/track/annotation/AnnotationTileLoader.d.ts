import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader } from "../TileLoader";
import { GeneInfo, TranscriptComponentInfo, TranscriptInfo, BigBedBroadPeakColumns, BigBedNarrowPeakColumns, BigBedTssPeakColumns, BigBedIdrPeakColumns, BigBedData3Plus, BigBedData6Plus, BigBedData9Plus } from "./AnnotationTypes";
import { BigLoader } from "../../formats";
import { Contig, AnnotationTrackModel } from "../..";
export declare type Gene = GeneInfo & {
    transcripts: Array<Transcript>;
} & BigBedBroadPeakColumns & BigBedNarrowPeakColumns & BigBedTssPeakColumns & BigBedIdrPeakColumns;
export declare type Transcript = TranscriptInfo & {
    exon: Array<TranscriptComponentInfo>;
    cds: Array<TranscriptComponentInfo>;
    utr: Array<TranscriptComponentInfo>;
    other: Array<TranscriptComponentInfo>;
};
declare type TilePayload = Array<Gene>;
declare enum AnnotationFormat {
    ValisGenes = 0,
    BigBed = 1,
    BigBedDataBroadPeak = 2,
    BigBedDataNarrowPeak = 3,
    BigBedDataTssPeak = 4,
    BigBedDataIdrPeak = 5,
    BigBedData3Plus = 6,
    BigBedData6Plus = 7,
    BigBedData9Plus = 8
}
export declare class AnnotationTileLoader extends TileLoader<TilePayload, void> {
    protected readonly dataSource: IDataSource;
    protected readonly model: AnnotationTrackModel;
    protected readonly contig: string;
    protected annotationFileFormat?: AnnotationFormat;
    readonly macroLod: number;
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    static cacheKey(model: AnnotationTrackModel): string;
    static getAnnotationFormat(model: AnnotationTrackModel): AnnotationFormat;
    static getAvailableContigs(model: AnnotationTrackModel): Promise<Array<Contig>>;
    constructor(dataSource: IDataSource, model: AnnotationTrackModel, contig: string, tileSize?: number);
    mapLodLevel(l: number): 0 | 5;
    protected _bigLoaderPromise: Promise<BigLoader>;
    protected getBigLoader(): Promise<BigLoader>;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
    static loadValisGenesAnnotations(path: string, contig: string, startBaseIndex: number, span: number, macro: boolean): Promise<TilePayload>;
}
export declare const parseBigBed3Plus: (chrom: string, startBase: number, endBase: number, rest: string) => BigBedData3Plus;
export declare const parseBigBed6Plus: (chrom: string, startBase: number, endBase: number, rest: string) => BigBedData6Plus;
export declare const parseBigBed9Plus: (chrom: string, startBase: number, endBase: number, rest: string) => BigBedData9Plus;
export default AnnotationTileLoader;
