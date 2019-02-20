import { TrackModel } from "../TrackModel";

export type SignalTrackModel = TrackModel & {
    readonly type: 'signal',
    readonly path: string,
    readonly color?: ArrayLike<number>,
    readonly autoScale?: boolean,
    readonly scale?: number,
}