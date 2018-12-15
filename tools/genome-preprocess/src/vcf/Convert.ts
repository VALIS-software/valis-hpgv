import * as fs from 'fs';
import * as path from 'path';
import { deleteDirectory } from '../FileSystemUtils';
import { any, string } from 'prop-types';
import Terminal from '../Terminal';
let splitPreserving = require("string-split-by");

export function vcfConvert(inputFilePath: string, outputDirectory: string): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
        let parser = new VCFParser({
            onMetadata: (meta) => {
            },
            onError: Terminal.error,
            onComplete: (vcf) => {
                if (vcf.metadata.contig != null) {
                    vcf.metadata.contig
                    Terminal.log(vcf.metadata.contig);

                }
                resolve([]);
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

enum VCFParseMode {
    LINE_START,
    META_LINE,
    FEATURE_LINE,
}

type VCF4_2 = {
    metadata: VCF4_2Metadata,
    columns: Array<string>,
    features: Array<VCF4_2Feature>
}

type VCF4_2Feature = {
    [key: string]: string,
    CHROM: string,
    POS: string,
    ID: string,
    REF: string,
    ALT: string,
    QUAL: string,
    FILTER: string,
    INFO: string,
};

type VCF4_2Metadata = {
    [key: string]: Array<any> | string | null | undefined | { [key: string]: string | undefined },
    
    fileformat: string | null,

    INFO: Array<{
        [key: string]: string | undefined,
        ID: string,
        Type: string,
        Number: string,
        Description?: string,
        Source?: string, 
        Version?: string,
    }>,
    ALT: Array<{
        [key: string]: string | undefined,
        ID: string,
        Description?: string,
    }>,
    FORMAT: Array<{
        [key: string]: string | undefined,
        ID: string,
        Type: string,
        Number: string,
        Description?: string,
    }>,
    FILTER: Array<{
        [key: string]: string | undefined,
        ID: string,
        Description?: string,
    }>,

    assembly?: string,
    contig?: {
        [key: string]: string | undefined,
        ID: string,
        length?: string,
    },

    SAMPLE: Array<{
        [key: string]: string | undefined,
        ID: string,
        Genomes?: string,
        Mixture?: string,
        Description?: string,
    }>,

    PEDIGREE: Array<{
        [key: string]: string,
    }>,
    pedigreeDB?: string,
}

type VCFParserCallbacks = {
    onComplete: (vcf4_2: VCF4_2) => void,
    onMetadata: (metadata: VCF4_2Metadata) => void,
    onFeature: (feature: VCF4_2Feature) => void,
    onError: (error: string) => void,
}

class VCFParser {

    protected output: VCF4_2 = {
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

    protected parserState: {
        mode: VCFParseMode,
        metaLineBuffer: string | null,
        featureLineBuffer: string | null,
    } = {
        mode: VCFParseMode.LINE_START,
        metaLineBuffer: null,
        featureLineBuffer: null,
    };

    protected callbacks: VCFParserCallbacks = {
        onComplete: () => {},
        onMetadata: () => {},
        onFeature: () => {},
        onError: () => {},
    };

    constructor(callbacks: Partial<VCFParserCallbacks>) {
        this.callbacks = {
            ...this.callbacks,
            ...callbacks,
        }
    }

    parseChunk = (chunk: string) => {
        let parserState = this.parserState;

        if (chunk == null) return;

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
                            // ignore
                            break;
                        }
                        default: {
                            // skip over preceding whitespace
                            if (/\s/.test(char)) {
                                // ignore
                            } else {
                                // metadata is complete
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
                            this.onMetaLine(parserState.metaLineBuffer as string);
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
                            this.onFeatureLine(parserState.featureLineBuffer as string);
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
    }

    end = () => {
        if (this.parserState.metaLineBuffer != null) {
            this.onMetaLine(this.parserState.metaLineBuffer as string);
        }
        if (this.parserState.featureLineBuffer != null) {
            this.onFeatureLine(this.parserState.featureLineBuffer as string);
        }

        this.callbacks.onComplete(this.output);
    }

    protected onMetaLine(line: string) {
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
                        (this.output.metadata[name] as Array<any>).push(this.parseMetaAssignments(value));
                    } else {
                        this.callbacks.onError(`Invalid value "${value}" for metadata "${name}"`);
                    }
                    break;
                }
                default: {
                    if (value != null && value[0] === '<' && value[value.length - 1] === '>') {
                            // remove outer angle brackets <> and parse inner as assignments
                        this.output.metadata[name] = this.parseMetaAssignments(value.substring(1, value.length - 1));
                    } else {
                        this.output.metadata[name] = value;
                    }
                    break;
                }
            }

        } else {
            // columns headers
            this.output.columns = line.substr(1).split('\t');
        }
    }

    protected onFeatureLine(line: string) {
        let feature: any = {};

        let parts = line.split('\t');
        for (let i = 0; i < parts.length; i++) {
            let columnHeader = this.output.columns[i];
            if (columnHeader == null) {
                this.callbacks.onError(`Feature value in unspecified column (index ${i})`);
            } else {
                feature[columnHeader] = parts[i];
            }
        }

        this.output.features.push(feature);
        this.callbacks.onFeature(feature);
    }

    protected onMetaComplete(metadata: VCF4_2Metadata) {
        this.callbacks.onMetadata(metadata);
    }

    protected parseMetaAssignments(string: string): any {
        let data: any = {};

        let stringMarkers = ['"', '\''];

        let assignments = splitPreserving(string, ',', { ignore: ['"', '\''] });

        for (let assignment of assignments) {
            let parts: Array<string> = splitPreserving(assignment, '=', { ignore: ['"', '\''] });

            // unwrap string markers "hello" -> hello
            parts = parts.map(
                (str) => stringMarkers.indexOf(str[0]) !== -1 ? str.substring(1, str.length - 1) : str
            );

            // apply assignment
            let assignmentName = parts[0];
            let assignmentValue = parts[1];
            data[assignmentName] = assignmentValue;
        }

        return data;
    }

}