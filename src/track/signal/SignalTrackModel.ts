import { TrackModel } from "../TrackModel";

export type SignalTrackModel = TrackModel & {
    readonly type: 'signal',

    readonly path: string,
}