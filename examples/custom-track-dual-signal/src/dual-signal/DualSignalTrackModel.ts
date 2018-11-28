import { SignalTrackModel } from "genome-visualizer";

export type DualSignalTrackModel = SignalTrackModel & {
    // override the 'type' field, this will be the track type identifier used within HPGV
    readonly type: 'dual-signal',
    // we add extra field 'path2' to supply the second bigwig file
    readonly path2: string,
}