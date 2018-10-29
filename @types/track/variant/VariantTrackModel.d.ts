import { TrackModel } from "../TrackModel";
export declare type VariantTrackModel = TrackModel & {
    readonly type: 'variant';
    readonly query?: any;
};
