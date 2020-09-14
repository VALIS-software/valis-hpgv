import IDataSource from "../../data-source/IDataSource";
import { Tile, TileLoader, TileState } from "../TileLoader";
import { GeneInfo, GenomeFeature, GenomeFeatureType, Strand, TranscriptComponentClass, TranscriptComponentInfo, TranscriptInfo, GeneClass, SoGeneClass, TranscriptClass } from "./AnnotationTypes";
import TrackModel from "../TrackModel";
import { UCSCBig, BigLoader } from "../../formats";
import { BigBedData, BigZoomData } from "bigwig-reader";
import { Formats, GenomicFileFormat } from "../../formats/Formats";
import { Contig, AnnotationTrackModel } from "../..";
import Axios from "axios";

// Tile payload is a list of genes extended with nesting
export type Gene = GeneInfo & {
    transcripts: Array<Transcript>;
};

export type Transcript = TranscriptInfo & {
    exon: Array<TranscriptComponentInfo>,
    cds: Array<TranscriptComponentInfo>,
    utr: Array<TranscriptComponentInfo>,
    other: Array<TranscriptComponentInfo>
}

type TilePayload = Array<Gene>;

enum AnnotationFormat {
    ValisGenes,
    BigBed,
}

export class AnnotationTileLoader extends TileLoader<TilePayload, void> {

    protected annotationFileFormat?: AnnotationFormat = null;

    readonly macroLod = 5;

    protected readonly macroLodBlendRange = 2;
    protected readonly macroLodThresholdLow = 7;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    static cacheKey(model: AnnotationTrackModel): string {
        return model.path;
    }

    static getAnnotationFormat(model: AnnotationTrackModel) {
        // determine annotation file format
        if (model.path != null) {
            let format = Formats.determineFormat(model.path);

            switch (format) {
                case GenomicFileFormat.ValisGenes:
                    return AnnotationFormat.ValisGenes;
                case GenomicFileFormat.BigBed:
                    return AnnotationFormat.BigBed;
                default:
                    // we have to guess
                    if (/bigbed/ig.test(model.path)) {
                        return AnnotationFormat.BigBed;
                    } else if (/vdna/ig.test(model.path)){
                        return AnnotationFormat.ValisGenes;
                    } else {
                        return AnnotationFormat.BigBed;
                    }
            }
        }

        return null;
    }

    static getAvailableContigs(model: AnnotationTrackModel): Promise<Array<Contig>> {
        let contigs = new Array<Contig>();

        let format = this.getAnnotationFormat(model);
        if (format != null) {
            switch (format) {
                case AnnotationFormat.ValisGenes:
                    if (model.path != null) {
                        return Axios.get(model.path + '/manifest.json')
                            .then((response) => {
                                // create a manifest that lists the available contigs
                                contigs = contigs.concat(response.data.contigs);
                            })
                            .catch((reason) => {
                                console.error(`Error loading manifest: ${reason}`);
                            }).then(_ => contigs);
                    }
                    break;
                case AnnotationFormat.BigBed:
                    if (model.path != null) {
                        return UCSCBig.getBigLoader(model.path).then(b => UCSCBig.getContigs(b.header));
                    }
                    break;
            }
        }

        return Promise.resolve(contigs);
    }

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: AnnotationTrackModel,
        protected readonly contig: string,
        tileSize: number = 1 << 20
    ) {
        super(tileSize, 1);
        this.annotationFileFormat = AnnotationTileLoader.getAnnotationFormat(model);
    }

    mapLodLevel(l: number) {
        if (l < this.macroLod) {
            return 0;
        } else {
            return this.macroLod;
        }
    }

    protected _bigLoaderPromise: Promise<BigLoader> = null;
    protected getBigLoader() {
        if (this._bigLoaderPromise == null) {
            this._bigLoaderPromise = UCSCBig.getBigLoader(this.model.path);
        }
        return this._bigLoaderPromise
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        let isMacro = tile.lodLevel >= this.macroLod;
        if (this.model.path != null) {
            switch (this.annotationFileFormat) {
                case AnnotationFormat.ValisGenes: {
                    // using path override
                    return AnnotationTileLoader.loadValisGenesAnnotations(this.model.path, this.contig, tile.x, tile.span, isMacro).then(transformAnnotationsValisGene);
                }
                case AnnotationFormat.BigBed: {
                    return this.getBigLoader().then(loader => {
                        // THIS ONLY WORKS IF WE'RE NOT USING ZOOM LEVELS:
                        // if the data has already been loaded into a higher LOD tile then we can just get it from there
                        // we can happily take all entries that cross the tiles span because the deduplication is done in the track renderer
                        let macroTile = this.getTileAtLod(tile.x + tile.span * 0.5, this.macroLod, false);

                        if (macroTile.state === TileState.Complete) {
                            // extract intersecting genes
                            let intersectingGenes = new Array<Gene>();
                            for (let gene of macroTile.payload) {
                                let notOverlapping = ((gene.startIndex + gene.length) < tile.x) || (gene.startIndex > (tile.x + tile.span));
                                if (!notOverlapping) {
                                    intersectingGenes.push(gene);
                                }
                            }

                            return intersectingGenes;
                        } else {
                            return loader.reader.readBigBedData(this.contig, tile.x, this.contig, tile.x + tile.span).then(transformAnnotationsBigBed);
                        }

                        /*
                        let zoomIndex: number | null  = loader.lodZoomIndexMap[tile.lodLevel];

                        if (zoomIndex == null || true) {
                            return loader.reader.readBigBedData(this.contig, tile.x, this.contig, tile.x + tile.span).then(transformAnnotationsBigBed);
                        } else {
                            // I haven't found a file in the wild where using zoom index tiles actually helps
                            // we lose strand information so the macro/micro transition doesn't feel great
                            // it's useful if macro tiles require lots of data but so far that doesn't seem to be the case
                            console.log('BigBED using zoomIndex', zoomIndex);
                            return loader.reader.readZoomData(
                                this.contig,
                                tile.x,
                                this.contig,
                                tile.x + tile.span,
                                zoomIndex
                            ).then(transformAnnotationsBigZoom);
                        }
                        */
                    });
                }
                default: {
                    return [];
                }
            }
        } else {
            return this.dataSource.loadAnnotations(this.contig, tile.x, tile.span, isMacro).then(transformAnnotationsValisGene);
        }
    }

    static loadValisGenesAnnotations(
        path: string,
        contig: string,
        startBaseIndex: number,
        span: number,
        macro: boolean,
    ): Promise<TilePayload> {
        let jsonPath = `${path}/${contig}${macro ? '-macro' : ''}/${startBaseIndex},${span}.json`;
        return new Promise<TilePayload>((resolve, reject) => {
            let request = new XMLHttpRequest();
            // disable caching (because of common browser bugs)
            request.open('GET', jsonPath, true);
            request.responseType = 'json';
            request.onloadend = () => {
                if (request.status >= 200 && request.status < 300) {
                    // success-like response
                    resolve(request.response);
                } else {
                    // error-like response
                    reject(`HTTP request error: ${request.statusText} (${request.status})`);
                }
            }
            request.send();
        });
    }

}

function transformAnnotationsBigBed(dataset: Array<BigBedData>): TilePayload {
    return dataset.map((data: BigBedData) => {
        let gene: Gene = {
            type: GenomeFeatureType.Gene,

            name: data.name === '.' ? undefined : data.name,

            startIndex: data.start,
            length: data.end - data.start,

            strand: data.strand as Strand,
            class: GeneClass.Unspecified,
            soClass: 'gene',
            
            transcriptCount: 0,
            transcripts: [{
                type: GenomeFeatureType.Transcript,

                startIndex: data.start,
                length: data.end - data.start,
                
                class: TranscriptClass.Unspecified,
                soClass: 'transcript',
                exon: data.exons == null ? [] : data.exons.map((exon) => {
                    let transcriptComponent: TranscriptComponentInfo = {
                        type: GenomeFeatureType.TranscriptComponent,
                        startIndex: exon.start,
                        length: exon.end - exon.start,
                        class: TranscriptComponentClass.Exon,
                        soClass: 'exon'
                    }
                    return transcriptComponent;
                }),
                cds: [],
                utr: [],
                other: [],
            }],
            score: data.score,
            color: String(data.color) // prevent error just in case of non-string
        };
        return gene;
    });
}

function transformAnnotationsBigZoom(dataset: Array<BigZoomData>): TilePayload {
    return dataset.map((data) => {
        let gene: Gene = {
            type: GenomeFeatureType.Gene,

            name: undefined,

            startIndex: data.start,
            length: data.end - data.start,

            strand: Strand.None,
            class: GeneClass.Unspecified,
            soClass: 'gene',

            transcriptCount: 0,
            transcripts: [],
        };
        return gene;
    });
}

function transformAnnotationsValisGene(flatFeatures: Array<GenomeFeature>): TilePayload {
    // convert flat list of features into a nested structure which is easier to work with for rendering
    let payload: TilePayload = new Array();
    let activeGene: TilePayload[0];
    let activeTranscript: TilePayload[0]['transcripts'][0];
    let lastType: number = -1;

    for (let i = 0; i < flatFeatures.length; i++) {
        let feature = flatFeatures[i];

        // validate feature type conforms to expected nesting order
        let deltaType = feature.type - lastType;
        if (deltaType > 1) {
            console.warn(`Invalid gene feature nesting: ${GenomeFeatureType[lastType]} -> ${GenomeFeatureType[feature.type]}`);
        }
        lastType = feature.type;

        if (feature.type === GenomeFeatureType.Gene) {
            let geneInfo = feature as GeneInfo;
            activeGene = {
                ...geneInfo,
                transcripts: [],
            };
            payload.push(activeGene);
        }

        if (feature.type === GenomeFeatureType.Transcript) {
            let transcriptInfo = feature as TranscriptInfo;
            if (activeGene == null) {
                console.warn(`Out of order Transcript – no parent gene found`);
                continue;
            }
            activeTranscript = {
                ...transcriptInfo,
                exon: [],
                cds: [],
                utr: [],
                other: [],
            };
            activeGene.transcripts.push(activeTranscript);
        }

        if (feature.type === GenomeFeatureType.TranscriptComponent) {
            let componentInfo = feature as TranscriptComponentInfo;
            if (activeTranscript == null) {
                console.warn(`Out of order TranscriptComponent – no parent transcript found`);
                continue;
            }

            // bucket components by class
            switch (componentInfo.class) {
                case TranscriptComponentClass.Exon: {
                    activeTranscript.exon.push(componentInfo);
                    break;
                }
                case TranscriptComponentClass.ProteinCodingSequence: {
                    // validate CDS ordering (must be startIndex ascending)
                    let lastCDS = activeTranscript.cds[activeTranscript.cds.length - 1];
                    if (lastCDS != null && (lastCDS.startIndex >= componentInfo.startIndex)) {
                        console.warn(`Out of order CDS – Protein coding components must be sorted by startIndex`);
                    }

                    activeTranscript.cds.push(componentInfo);
                    break;
                }
                case TranscriptComponentClass.Untranslated: {
                    activeTranscript.utr.push(componentInfo);
                    break;
                }
                default: {
                    activeTranscript.other.push(componentInfo);
                    break;
                }
            }
        }
    }

    return payload;
}

export default AnnotationTileLoader;