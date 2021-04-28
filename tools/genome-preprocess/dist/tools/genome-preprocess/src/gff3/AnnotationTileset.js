"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationTileset = void 0;
const AnnotationTypes_1 = require("./AnnotationTypes");
class AnnotationTileset {
    constructor(tileSize, topLevelOnly, onUnknownFeature, onError) {
        this.tileSize = tileSize;
        this.topLevelOnly = topLevelOnly;
        this.onUnknownFeature = onUnknownFeature;
        this.onError = onError;
        this.sequences = {};
        this.addTopLevelFeature = (feature) => {
            // tiles are determined at the top level	
            let i0 = Math.floor(feature.start / this.tileSize);
            let i1 = Math.floor(feature.end / this.tileSize);
            for (let i = i0; i <= i1; i++) {
                let tile = this.getTile(feature.sequenceId, i);
                this.addFeature(tile, feature);
            }
        };
    }
    addFeature(tile, feature) {
        let displayName;
        // if feature.name is missing then try to use the ID field
        if (feature.name != null) {
            displayName = feature.name;
        }
        else if (feature.id != null) {
            displayName = feature.id.split(':').pop();
        }
        let featureCommon = {
            name: displayName,
            startIndex: feature.start - 1,
            length: feature.end - feature.start + 1,
            soClass: feature.type,
        };
        if (AnnotationTypes_1.SoGeneClass.instance[feature.type] !== undefined) {
            // is gene	
            // sum child transcripts	
            let transcriptCount = feature.children.reduce((p, c) => {
                let isTranscript = AnnotationTypes_1.SoTranscriptClass.instance[c.type] !== undefined;
                return isTranscript ? (p + 1) : p;
            }, 0);
            let gene = Object.assign(Object.assign({}, featureCommon), { type: AnnotationTypes_1.GenomeFeatureType.Gene, class: AnnotationTypes_1.SoGeneClass.instance[feature.type], strand: feature.strand, transcriptCount: transcriptCount });
            tile.content.push(gene);
        }
        else if (AnnotationTypes_1.SoTranscriptClass.instance[feature.type] !== undefined) {
            // is transcript	
            let transcript = Object.assign(Object.assign({}, featureCommon), { type: AnnotationTypes_1.GenomeFeatureType.Transcript, class: AnnotationTypes_1.SoTranscriptClass.instance[feature.type] });
            tile.content.push(transcript);
        }
        else if (AnnotationTypes_1.SoTranscriptComponentClass.instance[feature.type] !== undefined) {
            // is transcript component	
            let info = Object.assign(Object.assign({}, featureCommon), { type: AnnotationTypes_1.GenomeFeatureType.TranscriptComponent, class: AnnotationTypes_1.SoTranscriptComponentClass.instance[feature.type] });
            if (feature.phase != null) {
                info.phase = feature.phase;
            }
            tile.content.push(info);
        }
        else {
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
    getTile(sequenceId, index) {
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
                    };
                }
            }
        }
        return tiles[index];
    }
}
exports.AnnotationTileset = AnnotationTileset;
exports.default = AnnotationTileset;
