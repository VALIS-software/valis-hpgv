import { TrackModel } from "../TrackModel";

export type IntervalTrackModel = TrackModel & {
    readonly type: 'interval',
}