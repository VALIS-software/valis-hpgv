import { Tile, TileStore } from "./TileStore";
import { GeneInfo, TranscriptComponentInfo, TranscriptInfo } from "../model/AnnotationTileset";
export declare type Gene = GeneInfo & {
    transcripts: Array<Transcript>;
};
export declare type Transcript = TranscriptInfo & {
    exon: Array<TranscriptComponentInfo>;
    cds: Array<TranscriptComponentInfo>;
    utr: Array<TranscriptComponentInfo>;
    other: Array<TranscriptComponentInfo>;
};
declare type TilePayload = Array<Gene>;
export declare class AnnotationTileStore extends TileStore<TilePayload, void> {
    protected contig: string;
    protected macro: boolean;
    constructor(contig: string, tileSize?: number, macro?: boolean);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export declare class MacroAnnotationTileStore extends AnnotationTileStore {
    constructor(sourceId: string);
}
export default AnnotationTileStore;
