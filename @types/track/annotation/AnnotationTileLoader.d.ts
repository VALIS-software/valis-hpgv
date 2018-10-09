import { Tile, TileLoader } from "../TileLoader";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from "./AnnotationTrackModel";
import { GeneInfo, TranscriptComponentInfo, TranscriptInfo } from "./AnnotationTypes";
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
export declare class AnnotationTileLoader extends TileLoader<TilePayload, void> {
    protected readonly model: AnnotationTrackModel;
    protected readonly contig: string;
    protected macro: boolean;
    constructor(model: AnnotationTrackModel, contig: string, tileSize?: number);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export declare class MacroAnnotationTileLoader extends TileLoader<TilePayload, void> {
    protected readonly model: MacroAnnotationTrackModel;
    protected readonly contig: string;
    protected annotationCache: AnnotationTileLoader;
    constructor(model: MacroAnnotationTrackModel, contig: string, tileSize?: number);
    protected mapLodLevel(l: number): number;
    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
}
export default AnnotationTileLoader;
