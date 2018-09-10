import { GeneInfo, GenomeFeatureType, TranscriptComponentClass, TranscriptComponentInfo, TranscriptInfo } from "sirius/AnnotationTileset";
import SiriusApi from "sirius/SiriusApi";
import { Tile, TileStore } from "./TileStore";

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

export type TilePayload = Array<Gene>;

export class AnnotationTileStore extends TileStore<TilePayload, void> {

    constructor(protected contig: string, tileSize: number = 1 << 20, protected macro: boolean = false) {
        super(tileSize, 1);
        
        SiriusApi.getContigInfo(contig).then((info) => {
            this.maximumX = info.length - 1;
        });
    }

    protected mapLodLevel(l: number) {
        return 0;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        return SiriusApi.loadAnnotations(this.contig, this.macro, tile.x, tile.span).then((flatFeatures) => {
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
                    console.warn(`Invalid gene feature nesting: ${GenomeFeatureType[lastType]} -> ${GenomeFeatureType[feature.type] }`);
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
        });
    }

}

export class MacroAnnotationTileStore extends AnnotationTileStore {

    constructor(sourceId: string) {
        super(sourceId, 1 << 25, true);
    }

}

export default AnnotationTileStore;