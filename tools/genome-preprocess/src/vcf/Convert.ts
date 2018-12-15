import * as fs from 'fs';
import * as path from 'path';
import { deleteDirectory } from '../FileSystemUtils';
import { any, string } from 'prop-types';
import Terminal from '../Terminal';

const vcf: BionodeVcf = require('bionode-vcf');

enum BionodeVcfEvent {
    'data',
    'end',
    'error',
}

type BionodeVcfFeature = {
    chr: string,
    pos: string,
    id: string,
    ref: string,
    alt: string,
    qual: string,
    filter: string,
    varinfo: { [key: string]: string },
    sampleinfo: Array<{ [key: string]: string }>,
    attributes: { [key: string]: string },
};

interface BionodeVcfEventMap {
    'data': BionodeVcfFeature,
    'end': void,
    'error': any,
}

type BionodeVcf = {
    read(path: string): void;
    on<E extends keyof BionodeVcfEventMap>(event: E, callback: (arg: BionodeVcfEventMap[E]) => void): void;
}

export function vcfConvert(inputFilePath: string, outputDirectory: string): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
        readVCFMetadata(inputFilePath).then((meta) => {
            Terminal.log(meta);
        });
        return;

        vcf.read(inputFilePath);
        vcf.on('data', (feature) => {
            Terminal.log(feature.chr);
        });
        vcf.on('error', (err) => {
            Terminal.error(err);
        });
        vcf.on('end', () => {
            resolve([]);
        });
    });
}

enum VCFParseMode {
    LINE_START,
    META_LINE,
    FEATURE_LINE,
}

type VCF4_2Metadata = {
    [key: string]: Array<string> | string | null | undefined,
    fileformat: string | null,
    INFO: Array<string>,
    ALT: Array<string>,
    FORMAT: Array<string>,
    FILTER: Array<string>,

    assembly?: string,
    contig?: string,

    SAMPLE: Array<string>,

    PEDIGREE: Array<string>,
    pedigreeDB?: string,
}

function readVCFMetadata(path: string): Promise<{ [ key: string ]: string }> {

    return new Promise((resolve, reject) => {

        let parserState: {
            mode: VCFParseMode,
            metaLineBuffer: string | null,
            featureLineBuffer: string | null,
            metadata: VCF4_2Metadata,
        } = {
            mode: VCFParseMode.LINE_START,
            metaLineBuffer: null,
            featureLineBuffer: null,
            metadata: {
                fileformat: null,
                INFO: [],
                ALT: [],
                FORMAT: [],
                FILTER: [],
                SAMPLE: [],
                PEDIGREE: [],
            }
        };

        // read metadata
        let stream = fs.createReadStream(path, {
            encoding: 'utf8',
            autoClose: true,
        });

        stream.on('data', (chunk) => {
            
            for (let char of chunk) {

                if (char == null) {
                    Terminal.error('char is null??');
                }
                
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
                                    onMetaComplete(parserState.metadata);
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
                                onMetaLine(parserState.metaLineBuffer as string);
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
                                onFeatureLine(parserState.featureLineBuffer as string);
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

        });

        stream.on('close', () => {
            if (parserState.metaLineBuffer != null) {
                onMetaLine(parserState.metaLineBuffer as string);
            }
            if (parserState.featureLineBuffer != null) {
                onFeatureLine(parserState.featureLineBuffer as string);
            }
        });


        stream.on('error', reject);

        function onMetaLine(line: string) {
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
                        if (value != null) {
                            parserState.metadata[name].push(value);
                        }
                        break;
                    }
                    default: {
                        parserState.metadata[name] = value;
                        break;
                    }
                }

            } else {
                // table header
                Terminal.log(`TABLE: ${line.substr(1).split('\t')}`);
            }
        }

        function onFeatureLine(line: string) {
            // Terminal.log(line);
        }

        function onMetaComplete(metadata: VCF4_2Metadata) {
            Terminal.log(metadata);
        }

    });
}