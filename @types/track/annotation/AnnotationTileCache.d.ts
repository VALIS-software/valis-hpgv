import { Tile, TileCache } from "../TileCache";
import { GeneInfo, TranscriptComponentInfo, TranscriptInfo } from "./AnnotationTypes";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from "./AnnotationTrackModel";
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
export declare class AnnotationTileCache extends TileCache<TilePayload, void> {
    protected readonly model: AnnotationTrackModel;
    protected readonly contig: string;
    protected macro: boolean;
    constructor(model: AnnotationTrackModel, contig: string, tileSize?: number);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export declare class MacroAnnotationTileCache extends TileCache<TilePayload, void> {
    protected readonly model: MacroAnnotationTrackModel;
    protected readonly contig: string;
    protected annotationCache: AnnotationTileCache;
    constructor(model: MacroAnnotationTrackModel, contig: string, tileSize?: number);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default AnnotationTileCache;
