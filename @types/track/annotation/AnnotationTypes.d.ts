export declare enum Strand {
    None = ".",
    Unknown = "?",
    Positive = "+",
    Negative = "-"
}
export declare enum GenomeFeatureType {
    Gene = 0,
    Transcript = 1,
    TranscriptComponent = 2
}
export interface GenomeFeature {
    type: GenomeFeatureType;
}
export declare enum GeneClass {
    Unspecified = 0,
    ProteinCoding = 1,
    NonProteinCoding = 2,
    Pseudo = 3
}
export interface GeneInfo extends GenomeFeature {
    type: GenomeFeatureType.Gene;
    name?: string;
    startIndex: number;
    length: number;
    strand: Strand;
    class: GeneClass;
    soClass: keyof SoGeneClass;
    transcriptCount: number;
    score?: number;
    color?: string;
}
export interface BigBedBroadPeakColumns {
    signalValue?: number;
    pValue?: number;
    qValue?: number;
}
export interface BigBedNarrowPeakColumns {
    signalValue?: number;
    pValue?: number;
    qValue?: number;
    peak?: number;
}
export interface BigBedTssPeakColumns {
    count?: number;
    gene_id?: string;
    gene_name?: string;
    tss_id?: string;
    peak_cov?: string;
}
export interface BigBedIdrPeakColumns {
    localIDR?: number;
    globalIDR?: number;
    rep1_chromStart?: number;
    rep1_chromEnd?: number;
    rep1_count?: number;
    rep2_chromStart?: number;
    rep2_chromEnd?: number;
    rep2_count?: number;
}
export interface BigBedData3Plus {
    chr: string;
    start: number;
    end: number;
}
export interface BigBedData6Plus {
    chr: string;
    start: number;
    end: number;
    name?: string;
    score?: number;
    strand?: string;
}
export interface BigBedData9Plus {
    chr: string;
    start: number;
    end: number;
    name?: string;
    score?: number;
    strand?: string;
    cdStart?: number;
    cdEnd?: number;
    color?: string;
}
export declare enum TranscriptClass {
    Unspecified = 0,
    ProteinCoding = 1,
    NonProteinCoding = 2
}
/**
 * Mature transcript – transcript after processing
 */
export interface TranscriptInfo extends GenomeFeature {
    type: GenomeFeatureType.Transcript;
    name?: string;
    startIndex: number;
    length: number;
    class: TranscriptClass;
    soClass: keyof SoTranscriptClass;
}
export declare enum TranscriptComponentClass {
    Exon = 0,
    Untranslated = 1,
    ProteinCodingSequence = 2
}
export interface TranscriptComponentInfo extends GenomeFeature {
    type: GenomeFeatureType.TranscriptComponent;
    name?: string;
    startIndex: number;
    length: number;
    class: TranscriptComponentClass;
    soClass: keyof SoTranscriptComponentClass;
    phase?: number;
}
export declare class SoGeneClass {
    [key: string]: undefined | GeneClass;
    readonly 'gene': GeneClass;
    readonly 'ncRNA_gene': GeneClass;
    readonly 'pseudogene': GeneClass;
    static readonly instance: SoGeneClass;
}
export declare class SoTranscriptClass {
    [key: string]: undefined | TranscriptClass;
    readonly 'transcript': TranscriptClass;
    readonly 'lnc_RNA': TranscriptClass;
    readonly 'mRNA': TranscriptClass;
    readonly 'pseudogenic_transcript': TranscriptClass;
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
