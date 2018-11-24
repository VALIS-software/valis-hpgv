"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Strand;
(function (Strand) {
    Strand["None"] = ".";
    Strand["Unknown"] = "?";
    Strand["Positive"] = "+";
    Strand["Negative"] = "-";
})(Strand = exports.Strand || (exports.Strand = {}));
var GenomeFeatureType;
(function (GenomeFeatureType) {
    // order corresponds to nesting depth
    GenomeFeatureType[GenomeFeatureType["Gene"] = 0] = "Gene";
    GenomeFeatureType[GenomeFeatureType["Transcript"] = 1] = "Transcript";
    GenomeFeatureType[GenomeFeatureType["TranscriptComponent"] = 2] = "TranscriptComponent";
})(GenomeFeatureType = exports.GenomeFeatureType || (exports.GenomeFeatureType = {}));
var GeneClass;
(function (GeneClass) {
    // this is a small, simplified subset of types specified in the Sequence Ontology
    GeneClass[GeneClass["Unspecified"] = 0] = "Unspecified";
    GeneClass[GeneClass["ProteinCoding"] = 1] = "ProteinCoding";
    GeneClass[GeneClass["NonProteinCoding"] = 2] = "NonProteinCoding";
    GeneClass[GeneClass["Pseudo"] = 3] = "Pseudo";
})(GeneClass = exports.GeneClass || (exports.GeneClass = {}));
var TranscriptClass;
(function (TranscriptClass) {
    TranscriptClass[TranscriptClass["Unspecified"] = 0] = "Unspecified";
    // aka protein coding RNA
    TranscriptClass[TranscriptClass["ProteinCoding"] = 1] = "ProteinCoding";
    // non-protein coding
    TranscriptClass[TranscriptClass["NonProteinCoding"] = 2] = "NonProteinCoding";
    // sub-types include
    // Ribosomal
    // Transfer
    // Small nuclear
    // Small nucleolar
})(TranscriptClass = exports.TranscriptClass || (exports.TranscriptClass = {}));
var TranscriptComponentClass;
(function (TranscriptComponentClass) {
    TranscriptComponentClass[TranscriptComponentClass["Exon"] = 0] = "Exon";
    TranscriptComponentClass[TranscriptComponentClass["Untranslated"] = 1] = "Untranslated";
    TranscriptComponentClass[TranscriptComponentClass["ProteinCodingSequence"] = 2] = "ProteinCodingSequence";
})(TranscriptComponentClass = exports.TranscriptComponentClass || (exports.TranscriptComponentClass = {}));
// small sub set of SO terms found in the Ensemble gff3 files
// for a more complete set, we should use data from https://github.com/The-Sequence-Ontology/SO-Ontologies
class SoGeneClass {
    constructor() {
        this['gene'] = GeneClass.Unspecified;
        this['ncRNA_gene'] = GeneClass.NonProteinCoding;
        this['pseudogene'] = GeneClass.Pseudo;
    }
}
SoGeneClass.instance = new SoGeneClass();
exports.SoGeneClass = SoGeneClass;
class SoTranscriptClass {
    constructor() {
        this['lnc_RNA'] = TranscriptClass.NonProteinCoding;
        this['mRNA'] = TranscriptClass.ProteinCoding;
        this['pseudogenic_transcript'] = TranscriptClass.Unspecified;
        this['transcript'] = TranscriptClass.Unspecified;
        this['miRNA'] = TranscriptClass.NonProteinCoding;
        this['ncRNA'] = TranscriptClass.NonProteinCoding;
        this['rRNA'] = TranscriptClass.NonProteinCoding;
        this['scRNA'] = TranscriptClass.NonProteinCoding;
        this['snoRNA'] = TranscriptClass.NonProteinCoding;
        this['snRNA'] = TranscriptClass.NonProteinCoding;
    }
}
SoTranscriptClass.instance = new SoTranscriptClass();
exports.SoTranscriptClass = SoTranscriptClass;
class SoTranscriptComponentClass {
    constructor() {
        this['CDS'] = TranscriptComponentClass.ProteinCodingSequence;
        this['exon'] = TranscriptComponentClass.Exon;
        this['five_prime_UTR'] = TranscriptComponentClass.Untranslated;
        this['three_prime_UTR'] = TranscriptComponentClass.Untranslated;
    }
}
SoTranscriptComponentClass.instance = new SoTranscriptComponentClass();
exports.SoTranscriptComponentClass = SoTranscriptComponentClass;
