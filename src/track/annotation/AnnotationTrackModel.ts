import { Strand } from 'genomics-formats/dist/gff3/Strand';
import { TrackModel } from '../TrackModel';

export type AnnotationTrackModel = TrackModel & {
    readonly type: 'annotation',

    readonly strand?: Strand,
    readonly compact?: boolean,

    readonly path?: string,
}

export type MacroAnnotationTrackModel = TrackModel & {
    readonly type: 'macro-annotation',

    readonly strand?: Strand,
    readonly compact?: boolean,

    readonly path?: string,
}