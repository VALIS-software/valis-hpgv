/**
 * Should be plain-old-data and easy to serialize
 * - Should encapsulate complete state, excluding transitive UI state
 * - Applying a TrackModel state should restore state exactly
 */
export declare type TrackModel = {
    type: string;
    name: string;
    longname?: string;
    heightPx?: number;
    expandedHeightPx?: number;
    highlightLocation?: string;
    fileFormatType?: string;
    expandable?: boolean;
    color?: Array<number>;
    styleSelector?: string;
    [field: string]: any;
};
export default TrackModel;
