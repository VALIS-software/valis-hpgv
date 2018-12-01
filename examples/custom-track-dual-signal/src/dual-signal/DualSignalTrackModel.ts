import { SignalTrackModel, TrackModel } from "genome-visualizer";

export type DualSignalTrackModel = TrackModel & {
    // override the 'type' field, this will be the track type identifier used within HPGV
    readonly type: 'dual-signal',
    // paths to bigwig files
    readonly path1: string,
    readonly path2: string,
}