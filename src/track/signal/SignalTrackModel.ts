import { TrackModel } from "../TrackModel";

export type SignalTrackModel = TrackModel & {
    readonly type: 'signal',

    readonly path: string, // @! this is a temporary field until signal data is a core part of a dataSource
}