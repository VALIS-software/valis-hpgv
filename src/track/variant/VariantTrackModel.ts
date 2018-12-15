import { TrackModel } from "../TrackModel";

export type VariantTrackModel = TrackModel & {
    readonly type: 'variant',
    readonly query?: any;
    readonly path?: string;
}