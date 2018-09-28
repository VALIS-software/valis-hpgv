import { Strand } from "genomics-formats/dist/gff3/Strand";
import { Feature } from "genomics-formats/dist/gff3/Feature";

export enum GenomeFeatureType {
	// order corresponds to nesting depth
	Gene,
	Transcript,
	TranscriptComponent,
}

export interface GenomeFeatureTypeMap {
	[GenomeFeatureType.Gene]: GeneInfo,
	[GenomeFeatureType.Transcript]: TranscriptInfo,
	[GenomeFeatureType.TranscriptComponent]: TranscriptComponentInfo,
}

export type GenomeFeature<E extends keyof GenomeFeatureTypeMap> = GenomeFeatureTypeMap[E] & {
	type: E,
}

export type TileContent = Array<GenomeFeature<keyof GenomeFeatureTypeMap>>;

export enum GeneClass {
	// this is a small, simplified subset of types specified in the Sequence Ontology
	Unspecified,
	ProteinCoding, // assumed default
	NonProteinCoding, // aka regulatory
	Pseudo, // non-functional imperfect copy
}

export type GeneInfo = {
	name?: string,
	startIndex: number,
	length: number,
	strand: Strand,
	class: GeneClass,
	soClass: keyof SoGeneClass,
	transcriptCount: number,
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
export type TranscriptInfo = {
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

export type TranscriptComponentInfo = {
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

	readonly 'lnc_RNA' = TranscriptClass.NonProteinCoding;
	readonly 'mRNA' = TranscriptClass.ProteinCoding;
	readonly 'pseudogenic_transcript' = TranscriptClass.Unspecified;
	readonly 'transcript' = TranscriptClass.Unspecified;
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

type Tile = {
	startIndex: number,
	span: number,
	content: TileContent
}

export class Tileset {

	readonly sequences: { [sequenceId: string]: Array<Tile> } = {};

	constructor(
		protected tileSize: number,
		protected topLevelOnly: boolean,
		protected onUnknownFeature: (feature: Feature) => void,
		protected onError: (reason: string) => void,
	) {}

	addTopLevelFeature = (feature: Feature) => {
		// tiles are determined at the top level
		let i0 = Math.floor(feature.start / this.tileSize);
		let i1 = Math.floor(feature.end / this.tileSize);
		for (let i = i0; i <= i1; i++) {
			let tile = this.getTile(feature.sequenceId, i);
			this.addFeature(tile, feature);
		}
	}

	protected addFeature(tile: Tile, feature: Feature) {
		let featureCommon = {
			name: feature.name,
			startIndex: feature.start - 1,
			length: feature.end - feature.start + 1,
			soClass: feature.type,
		}

		if (SoGeneClass.instance[feature.type] !== undefined) {
			// is gene
			// sum child transcripts
			let transcriptCount = feature.children.reduce((p: number, c: Feature) => {
				let isTranscript = SoTranscriptClass.instance[c.type] !== undefined;
				return isTranscript ? (p + 1) : p;
			}, 0);
			let gene: GenomeFeature<GenomeFeatureType.Gene> = {
				...featureCommon,
				type: GenomeFeatureType.Gene,
				class: SoGeneClass.instance[feature.type] as any,
				strand: feature.strand,
				transcriptCount: transcriptCount
			}
			tile.content.push(gene);
		} else if (SoTranscriptClass.instance[feature.type] !== undefined) {
			// is transcript
			let transcript: GenomeFeature<GenomeFeatureType.Transcript> = {
				...featureCommon,
				type: GenomeFeatureType.Transcript,
				class: SoTranscriptClass.instance[feature.type] as any,
			}
			tile.content.push(transcript);
		} else if (SoTranscriptComponentClass.instance[feature.type] !== undefined) {
			// is transcript component
			let info: GenomeFeature<GenomeFeatureType.TranscriptComponent> = {
				...featureCommon,
				type: GenomeFeatureType.TranscriptComponent,
				class: SoTranscriptComponentClass.instance[feature.type] as any,
			};
			if (feature.phase != null) {
				info.phase = feature.phase;
			}
			tile.content.push(info);
		} else {
			this.onUnknownFeature(feature);
			return;
		}

		if (!this.topLevelOnly) {
			for (let child of feature.children) {
				this.addFeature(tile, child);
			}
		}
	}

	protected getTile(sequenceId: string, index: number) {
		let tiles = this.sequences[sequenceId];

		if (tiles === undefined) {
			// create tile array for sequence
			tiles = this.sequences[sequenceId] = [];
		}

		if (tiles[index] === undefined) {
			// create intervening tiles
			for (let i = 0; i <= index; i++) {
				if (tiles[i] === undefined) {
					tiles[i] = {
						startIndex: i * this.tileSize,
						span: this.tileSize,
						content: []
					}
				}
			}
		}

		return tiles[index];
	}

}