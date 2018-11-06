/**
 * Should be plain-old-data and easy to serialize
 * - Should encapsulate complete state, excluding transitive UI state
 * - Applying a TrackModel state should restore state exactly
 */
export type TrackModel = {
    type: string,

    // display properties
    name: string,
    heightPx?: number,

    color?: Array<number>,

    [field: string]: any,
};

export default TrackModel;