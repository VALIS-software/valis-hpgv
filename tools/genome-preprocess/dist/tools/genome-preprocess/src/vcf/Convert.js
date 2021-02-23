"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vcfConvert = void 0;
const fs = require("fs");
const path = require("path");
const Terminal_1 = require("../Terminal");
const AnnotationTileset_1 = require("../gff3/AnnotationTileset");
const Strand_1 = require("genomics-formats/lib/gff3/Strand");
const Tileset_1 = require("../Tileset");
const splitPreserving = require("string-split-by");
const mkdirp = require('mkdirp');
const deepEqual = require('fast-deep-equal');
function vcfConvert(inputFilePath, outputDirectory) {
    return new Promise((resolve, reject) => {
        let parser = new VCFParser({
            onMetadata: (meta) => {
            },
            onError: (err) => Terminal_1.default.error(err),
            onComplete: (vcf) => {
                let filesWritten = new Array();
                Terminal_1.default.log(`<b>Processing <cyan>${inputFilePath}</></b>`);
                let contigRange = { startIndex: 0, length: 0 };
                if (vcf.metadata.contig != null) {
                    let metadataRange = rangeFromContig(vcf.metadata.contig.ID);
                    if (metadataRange != null) {
                        contigRange = metadataRange;
                    }
                }
                let tileset = new Tileset_1.default(1 << 15);
                for (let feature of vcf.features) {
                    let featureIndex = parseInt(feature.POS);
                    let range = rangeFromContig(feature.CHROM) || contigRange;
                    let featureAbsoluteIndex = range.startIndex + (parseInt(feature.POS) - 1);
                    tileset.addFeature('main', featureAbsoluteIndex, 1, {
                        id: feature.ID,
                        baseIndex: featureAbsoluteIndex,
                        refSequence: feature.REF,
                        alts: feature.ALT.split('')
                    });
                }
                let inputFilename = path.basename(inputFilePath);
                saveSequence(tileset.sequences['main'] || [], `${outputDirectory}/${inputFilename.toLowerCase()}.vvariants-dir/${inputFilename.toLowerCase()}`);
                // @! temporary, save out genes for biobureau demo
                // filesWritten = filesWritten.concat(biobureauGenerateGenes(inputFilePath, outputDirectory, vcf));
                resolve(filesWritten);
            }
        });
        let stream = fs.createReadStream(inputFilePath, {
            encoding: 'utf8',
            autoClose: true,
        });
        stream.on('data', parser.parseChunk);
        stream.on('close', parser.end);
        stream.on('error', reject);
        return;
    });
}
exports.vcfConvert = vcfConvert;
function rangeFromContig(contig) {
    let match = /:(\d+)-(\d+)/.exec(contig);
    if (match) {
        let startBase = parseInt(match[1]);
        let endBase = parseInt(match[2]);
        return {
            startIndex: startBase - 1,
            length: (endBase - startBase) + 1
        };
    }
    else {
    }
}
function saveSequence(sequence, directory) {
    let filesWritten = new Set();
    for (let tile of sequence) {
        let filename = `${tile.startIndex.toFixed(0)},${tile.span.toFixed(0)}`;
        let filePath = `${directory}/${filename}.json`;
        mkdirp.sync(path.dirname(filePath));
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(tile.content));
        }
        else {
            let existingContent = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }));
            for (let feature of tile.content) {
                let match = existingContent.find((existingFeature) => {
                    return deepEqual(feature, existingFeature);
                });
                if (!match) {
                    existingContent.push(feature);
                }
            }
            fs.writeFileSync(filePath, JSON.stringify(existingContent));
        }
        filesWritten.add(filePath);
    }
    return filesWritten;
}
// @! temporary to generate genes from custom biobureau files
// @! not sure how this translates into files from other sources
function biobureauGenerateGenes(inputFilePath, outputDirectory, vcf) {
    const lodLevel0TileSize = 1 << 20;
    let biobureauFilenameMatch = /^LF_itr6_\d+_([^\.]+)/.exec(path.basename(inputFilePath));
    let biobureauGeneName;
    if (biobureauFilenameMatch) {
        biobureauGeneName = biobureauFilenameMatch[1];
    }
    else {
        throw `Biobureau demo: filename does not match (@! remove this)`;
    }
    let filesWritten = new Set();
    let biobureauGeneTileset = new AnnotationTileset_1.default(lodLevel0TileSize, // ~1 million,
    false, (f) => Terminal_1.default.error(`Unknown feature`, f), Terminal_1.default.error);
    let macroLodLevel = 5;
    let biobureauGeneMacroTileset = new AnnotationTileset_1.default(lodLevel0TileSize * (1 << macroLodLevel), true, (f) => Terminal_1.default.error(`Unknown feature`, f), Terminal_1.default.error);
    if (vcf.metadata.contig != null) {
        let biobureauContigPattern = /([^.]+)\.([^:]+):(\d+)-(\d+)/;
        let biobureauMatch = biobureauContigPattern.exec(vcf.metadata.contig.ID);
        if (biobureauMatch != null) {
            let species = biobureauMatch[1];
            let namedRegion = biobureauMatch[2];
            let startBase = parseInt(biobureauMatch[3]);
            let endBase = parseInt(biobureauMatch[4]);
            let feature = {
                sequenceId: 'main',
                id: biobureauGeneName,
                name: biobureauGeneName,
                type: 'gene',
                children: [],
                start: startBase,
                end: endBase,
                strand: Strand_1.default.Unknown,
                phase: null,
                attributes: { isCircular: false, custom: {} },
            };
            biobureauGeneTileset.addTopLevelFeature(feature);
            biobureauGeneMacroTileset.addTopLevelFeature(feature);
            saveSequence(biobureauGeneTileset.sequences['main'] || [], `${outputDirectory}/${species.toLowerCase()}.vgenes-dir/${species.toLowerCase()}`);
            saveSequence(biobureauGeneMacroTileset.sequences['main'] || [], `${outputDirectory}/${species.toLowerCase()}.vgenes-dir/${species.toLowerCase()}-macro`);
        }
    }
    let array = new Array();
    for (let path of filesWritten)
        array.push(path);
    return array;
}
/**
 * VCF v4.2 Parser
 * @author George Corney (haxiomic)
 */
var VCFParseMode;
(function (VCFParseMode) {
    VCFParseMode[VCFParseMode["LINE_START"] = 0] = "LINE_START";
    VCFParseMode[VCFParseMode["META_LINE"] = 1] = "META_LINE";
    VCFParseMode[VCFParseMode["FEATURE_LINE"] = 2] = "FEATURE_LINE";
})(VCFParseMode || (VCFParseMode = {}));
class VCFParser {
    constructor(callbacks) {
        this.output = {
            columns: ['CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'FILTER', 'INFO'],
            features: [],
            metadata: {
                fileformat: null,
                INFO: [],
                ALT: [],
                FORMAT: [],
                FILTER: [],
                SAMPLE: [],
                PEDIGREE: [],
            },
        };
        this.parserState = {
            mode: VCFParseMode.LINE_START,
            metaLineBuffer: null,
            featureLineBuffer: null,
        };
        this.callbacks = {
            onComplete: () => { },
            onMetadata: () => { },
            onFeature: () => { },
            onError: () => { },
        };
        this.parseChunk = (chunk) => {
            let parserState = this.parserState;
            if (chunk == null)
                return;
            for (let char of chunk) {
                switch (parserState.mode) {
                    case VCFParseMode.LINE_START: {
                        switch (char) {
                            case '#': {
                                parserState.mode = VCFParseMode.META_LINE;
                                parserState.metaLineBuffer = char;
                                break;
                            }
                            case '\n': {
                                // ignore empty lines
                                break;
                            }
                            default: {
                                // skip over preceding whitespace
                                if (/\s/.test(char)) {
                                    // ignore
                                }
                                else {
                                    // metadata is complete (all metadata lines start with a #)
                                    this.onMetaComplete(this.output.metadata);
                                    parserState.mode = VCFParseMode.FEATURE_LINE;
                                    parserState.featureLineBuffer = char;
                                }
                                break;
                            }
                        }
                        break;
                    }
                    case VCFParseMode.META_LINE: {
                        switch (char) {
                            case '\n': {
                                // line complete
                                this.onMetaLine(parserState.metaLineBuffer);
                                parserState.metaLineBuffer = null;
                                parserState.mode = VCFParseMode.LINE_START;
                                break;
                            }
                            default: {
                                parserState.metaLineBuffer += char;
                                break;
                            }
                        }
                        break;
                    }
                    case VCFParseMode.FEATURE_LINE: {
                        switch (char) {
                            case '\n': {
                                // line complete
                                this.onFeatureLine(parserState.featureLineBuffer);
                                parserState.featureLineBuffer = '';
                                // we don't need to return to LINE_START because we don't allow meta lines within the data lines 
                                parserState.mode = VCFParseMode.FEATURE_LINE;
                                break;
                            }
                            default: {
                                parserState.featureLineBuffer += char;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        };
        this.end = () => {
            if (this.parserState.metaLineBuffer != null) {
                this.onMetaLine(this.parserState.metaLineBuffer);
            }
            if (this.parserState.featureLineBuffer != null) {
                this.onFeatureLine(this.parserState.featureLineBuffer);
            }
            this.callbacks.onComplete(this.output);
        };
        this.callbacks = Object.assign(Object.assign({}, this.callbacks), callbacks);
    }
    onMetaLine(line) {
        if (line.trim() === '')
            return;
        if (line.substr(0, 2) === '##') {
            // meta line
            let eqIndex = line.indexOf('=', 2);
            let name = line.substring(2, eqIndex != -1 ? eqIndex : undefined).trim();
            let value = eqIndex != -1 ? line.substring(eqIndex + 1).trim() : null;
            switch (name) {
                case 'INFO':
                case 'ALT':
                case 'FORMAT':
                case 'FILTER':
                case 'SAMPLE':
                case 'PEDIGREE': {
                    if (value != null && value[0] === '<' && value[value.length - 1] === '>') {
                        this.output.metadata[name].push(this.parseMetaAssignments(value));
                    }
                    else {
                        this.callbacks.onError(`Invalid value "${value}" for metadata "${name}"`);
                    }
                    break;
                }
                default: {
                    if (value != null && value[0] === '<' && value[value.length - 1] === '>') {
                        // remove outer angle brackets <> and parse inner as assignments
                        this.output.metadata[name] = this.parseMetaAssignments(value.substring(1, value.length - 1));
                    }
                    else {
                        this.output.metadata[name] = value;
                    }
                    break;
                }
            }
        }
        else {
            // columns headers
            this.output.columns = line.substr(1).split('\t');
        }
    }
    onFeatureLine(line) {
        if (line.trim() === '')
            return;
        let feature = {};
        let parts = line.split('\t');
        if (parts.length !== this.output.columns.length) {
            this.callbacks.onError(`Unexpected number of columns for feature line "${line}", got ${parts.length}, expected ${this.output.columns.length}`);
        }
        for (let i = 0; i < parts.length; i++) {
            let columnHeader = this.output.columns[i];
            if (columnHeader == null) {
                this.callbacks.onError(`Feature value in unspecified column (index ${i})`);
            }
            else {
                feature[columnHeader] = parts[i];
            }
        }
        this.output.features.push(feature);
        this.callbacks.onFeature(feature);
    }
    onMetaComplete(metadata) {
        this.callbacks.onMetadata(metadata);
    }
    parseMetaAssignments(string) {
        let data = {};
        let stringMarkers = ['"', '\''];
        let assignments = splitPreserving(string, ',', { ignore: ['"', '\''] });
        for (let assignment of assignments) {
            let parts = splitPreserving(assignment, '=', { ignore: ['"', '\''] });
            // unwrap string markers "hello" -> hello
            parts = parts.map((str) => stringMarkers.indexOf(str[0]) !== -1 ? str.substring(1, str.length - 1) : str);
            // apply assignment
            let assignmentName = parts[0];
            let assignmentValue = parts[1];
            data[assignmentName] = assignmentValue;
        }
        return data;
    }
}
