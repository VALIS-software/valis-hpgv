import { TrackModel } from "../TrackModel";
export declare type SignalTrackModel = TrackModel & {
    readonly type: 'signal';
    readonly path: string;
    readonly color?: ArrayLike<number>;
};
