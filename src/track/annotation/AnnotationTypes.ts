export enum Strand {
	None = '.',
	Unknown = '?',
	Positive = '+',
	Negative = '-'
}

export enum GenomeFeatureType {
	// order corresponds to nesting depth
	Gene,
	Transcript,
	TranscriptComponent,
}

export interface GenomeFeature {
	type: GenomeFeatureType,
}

export enum GeneClass {
	// this is a small, simplified subset of types specified in the Sequence Ontology
	Unspecified,
	ProteinCoding, // assumed default
	NonProteinCoding, // aka regulatory
	Pseudo, // non-functional imperfect copy
}

export interface GeneInfo extends GenomeFeature {
	type: GenomeFeatureType.Gene,
	name?: string,
	startIndex: number,
	length: number,
	strand: Strand,
	class: GeneClass,
	soClass: keyof SoGeneClass,
	transcriptCount: number,
	score?: number,
	color?: string,
}

// columns in Broad Peak but not in UCSC bed
export interface BigBedBroadPeakColumns {
	signalValue?: number,
	pValue?: number,
	qValue?: number,
}

// columns in Narrow Peak but not in UCSC bed
export interface BigBedNarrowPeakColumns {
	signalValue?: number,
	pValue?: number,
	qValue?: number,
	peak?: number,
}

// columns in TSS but not in UCSC bed
export interface BigBedTssPeakColumns {
	count?: number,
	gene_id?: string,
	gene_name?: string,
	tss_id?: string,
	peak_cov?: string,
}

// columns in IDR Peak but not in UCSC bed
export interface BigBedIdrPeakColumns {
	localIDR?: number,
	globalIDR?: number,
	rep1_chromStart?: number,
	rep1_chromEnd?: number,
	rep1_count?: number,
	rep2_chromStart?: number,
	rep2_chromEnd?: number,
	rep2_count?: number,
}

// Definition of BigBed3+. Only columns that are not unambigious are used and the rest ignored
export interface BigBedData3Plus {
    chr: string,
    start: number,
    end: number,
}

// Definition of BigBed6+. Only columns that are not unambigious are used and the rest ignored
export interface BigBedData6Plus {
    chr: string,
    start: number,
    end: number,
    name?: string,
    score?: number,
    strand?: string,
}

// Definition of BigBed9+. Only columns that are not unambigious are used and the rest ignored
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


export enum TranscriptClass {
	Unspecified,
	// aka protein coding RNA
	ProteinCoding,
	// non-protein coding
	NonProteinCoding,
		// sub-types include
		// Ribosomal
		// Transfer
		// Small nuclear
		// Small nucleolar
}

/**
 * Mature transcript – transcript after processing
 */
export interface TranscriptInfo extends GenomeFeature {
	type: GenomeFeatureType.Transcript,
	name?: string,
	startIndex: number,
	length: number,
	class: TranscriptClass,
	soClass: keyof SoTranscriptClass,
}

export enum TranscriptComponentClass {
	Exon,
	Untranslated,
	ProteinCodingSequence,
}

export interface TranscriptComponentInfo extends GenomeFeature {
	type: GenomeFeatureType.TranscriptComponent,
	name?: string,
	startIndex: number,
	length: number,
	class: TranscriptComponentClass,
	soClass: keyof SoTranscriptComponentClass,
	phase?: number, // see https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md#description-of-the-format
}

// small sub set of SO terms found in the Ensemble gff3 files
// for a more complete set, we should use data from https://github.com/The-Sequence-Ontology/SO-Ontologies
export class SoGeneClass {
	[key: string]: undefined | GeneClass;

	readonly 'gene' = GeneClass.Unspecified;
	readonly 'ncRNA_gene' = GeneClass.NonProteinCoding;
	readonly 'pseudogene' = GeneClass.Pseudo;

	static readonly instance = new SoGeneClass();
}

export class SoTranscriptClass {
	[key: string]: undefined | TranscriptClass;

	readonly 'transcript' = TranscriptClass.Unspecified;
	readonly 'lnc_RNA' = TranscriptClass.NonProteinCoding;
	readonly 'mRNA' = TranscriptClass.ProteinCoding;
	readonly 'pseudogenic_transcript' = TranscriptClass.Unspecified;
	readonly 'miRNA' = TranscriptClass.NonProteinCoding;
	readonly 'ncRNA' = TranscriptClass.NonProteinCoding;
	readonly 'rRNA' = TranscriptClass.NonProteinCoding;
	readonly 'scRNA' = TranscriptClass.NonProteinCoding;
	readonly 'snoRNA' = TranscriptClass.NonProteinCoding;
	readonly 'snRNA' = TranscriptClass.NonProteinCoding;

	static readonly instance = new SoTranscriptClass();
}

export class SoTranscriptComponentClass {
	[key: string]: undefined | TranscriptComponentClass;

	readonly 'CDS' = TranscriptComponentClass.ProteinCodingSequence;
	readonly 'exon' = TranscriptComponentClass.Exon;
	readonly 'five_prime_UTR' = TranscriptComponentClass.Untranslated;
	readonly 'three_prime_UTR' = TranscriptComponentClass.Untranslated;

	static readonly instance = new SoTranscriptComponentClass();
}