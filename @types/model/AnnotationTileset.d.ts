import { Strand } from "genomics-formats/dist/gff3/Strand";
import { Feature } from "genomics-formats/dist/gff3/Feature";
export declare enum GenomeFeatureType {
    Gene = 0,
    Transcript = 1,
    TranscriptComponent = 2
}
export interface GenomeFeatureTypeMap {
    [GenomeFeatureType.Gene]: GeneInfo;
    [GenomeFeatureType.Transcript]: TranscriptInfo;
    [GenomeFeatureType.TranscriptComponent]: TranscriptComponentInfo;
}
export declare type GenomeFeature<E extends keyof GenomeFeatureTypeMap> = GenomeFeatureTypeMap[E] & {
    type: E;
};
export declare type TileContent = Array<GenomeFeature<keyof GenomeFeatureTypeMap>>;
export declare enum GeneClass {
    Unspecified = 0,
    ProteinCoding = 1,
    NonProteinCoding = 2,
    Pseudo = 3
}
export declare type GeneInfo = {
    name?: string;
    startIndex: number;
    length: number;
    strand: Strand;
    class: GeneClass;
    soClass: keyof SoGeneClass;
    transcriptCount: number;
};
export declare enum TranscriptClass {
    Unspecified = 0,
    ProteinCoding = 1,
    NonProteinCoding = 2
}
/**
 * Mature transcript – transcript after processing
 */
export declare type TranscriptInfo = {
    name?: string;
    startIndex: number;
    length: number;
    class: TranscriptClass;
    soClass: keyof SoTranscriptClass;
};
export declare enum TranscriptComponentClass {
    Exon = 0,
    Untranslated = 1,
    ProteinCodingSequence = 2
}
export declare type TranscriptComponentInfo = {
    name?: string;
    startIndex: number;
    length: number;
    class: TranscriptComponentClass;
    soClass: keyof SoTranscriptComponentClass;
    phase?: number;
};
export declare class SoGeneClass {
    [key: string]: undefined | GeneClass;
    readonly 'gene': GeneClass;
    readonly 'ncRNA_gene': GeneClass;
    readonly 'pseudogene': GeneClass;
    static readonly instance: SoGeneClass;
}
export declare class SoTranscriptClass {
    [key: string]: undefined | TranscriptClass;
    readonly 'lnc_RNA': TranscriptClass;
    readonly 'mRNA': TranscriptClass;
    readonly 'pseudogenic_transcript': TranscriptClass;
    readonly 'transcript': TranscriptClass;
    readonly 'miRNA': TranscriptClass;
    readonly 'ncRNA': TranscriptClass;
    readonly 'rRNA': TranscriptClass;
    readonly 'scRNA': TranscriptClass;
    readonly 'snoRNA': TranscriptClass;
    readonly 'snRNA': TranscriptClass;
    static readonly instance: SoTranscriptClass;
}
export declare class SoTranscriptComponentClass {
    [key: string]: undefined | TranscriptComponentClass;
    readonly 'CDS': TranscriptComponentClass;
    readonly 'exon': TranscriptComponentClass;
    readonly 'five_prime_UTR': TranscriptComponentClass;
    readonly 'three_prime_UTR': TranscriptComponentClass;
    static readonly instance: SoTranscriptComponentClass;
}
declare type Tile = {
    startIndex: number;
    span: number;
    content: TileContent;
};
export declare class Tileset {
    protected tileSize: number;
    protected topLevelOnly: boolean;
    protected onUnknownFeature: (feature: Feature) => void;
    protected onError: (reason: string) => void;
    readonly sequences: {
        [sequenceId: string]: Array<Tile>;
    };
    constructor(tileSize: number, topLevelOnly: boolean, onUnknownFeature: (feature: Feature) => void, onError: (reason: string) => void);
    addTopLevelFeature: (feature: Feature) => void;
    protected addFeature(tile: Tile, feature: Feature): void;
    protected getTile(sequenceId: string, index: number): Tile;
}
export {};
