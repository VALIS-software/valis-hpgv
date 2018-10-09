import { TrackModel } from '../TrackModel';
import { Strand } from 'genomics-formats/dist/gff3/Strand';
export declare type AnnotationTrackModel = TrackModel & {
    readonly type: 'annotation';
    readonly strand: Strand;
};
export declare type MacroAnnotationTrackModel = TrackModel & {
    readonly type: 'macro-annotation';
    readonly strand: Strand;
};
