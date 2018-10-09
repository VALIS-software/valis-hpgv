import { TrackModel } from "../TrackModel";
export declare type IntervalTrackModel = TrackModel & {
    readonly type: 'interval';
    readonly query: any;
    readonly tileCacheType: string;
    readonly blendEnabled: boolean;
};
