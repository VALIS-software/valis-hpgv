import { Feature } from "genomics-formats/lib/gff3/Feature";
import { SoGeneClass, SoTranscriptClass, GenomeFeature, GenomeFeatureType, SoTranscriptComponentClass, GeneInfo, TranscriptComponentInfo, TranscriptInfo } from "./AnnotationTypes";

export type AnnotationTile = {
    startIndex: number,
    span: number,
    content: Array<GenomeFeature>
};

export class AnnotationTileset {

    readonly sequences: { [sequenceId: string]: Array<AnnotationTile> } = {};

    constructor(
        protected tileSize: number,
        protected topLevelOnly: boolean,
        protected onUnknownFeature: (feature: Feature) => void,
        protected onError: (reason: string) => void,
    ) { }

    addTopLevelFeature = (feature: Feature) => {
        // tiles are determined at the top level	
        let i0 = Math.floor(feature.start / this.tileSize);
        let i1 = Math.floor(feature.end / this.tileSize);
        for (let i = i0; i <= i1; i++) {
            let tile = this.getTile(feature.sequenceId, i);
            this.addFeature(tile, feature);
        }
    }

    protected addFeature(tile: AnnotationTile, feature: Feature) {
        let displayName: string | undefined;

        // if feature.name is missing then try to use the ID field
        if (feature.name != null) {
            displayName = feature.name;
        } else if (feature.id != null) {
            displayName = feature.id.split(':').pop() as string;
        }

        let featureCommon = {
            name: displayName,
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
            let gene: GeneInfo = {
                ...featureCommon,
                type: GenomeFeatureType.Gene,
                class: SoGeneClass.instance[feature.type] as any,
                strand: feature.strand,
                transcriptCount: transcriptCount
            }
            tile.content.push(gene);
        } else if (SoTranscriptClass.instance[feature.type] !== undefined) {
            // is transcript	
            let transcript: TranscriptInfo = {
                ...featureCommon,
                type: GenomeFeatureType.Transcript,
                class: SoTranscriptClass.instance[feature.type] as any,
            }
            tile.content.push(transcript);
        } else if (SoTranscriptComponentClass.instance[feature.type] !== undefined) {
            // is transcript component	
            let info: TranscriptComponentInfo = {
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
            // ensure children are sorted by start index ascending
            feature.children.sort((a, b) => a.start - b.start);
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

export default AnnotationTileset; 