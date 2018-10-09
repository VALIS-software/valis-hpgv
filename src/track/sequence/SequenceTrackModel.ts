import { TrackModel } from "../TrackModel";

export type SequenceTrackModel = TrackModel & {
    readonly type: 'sequence'
};