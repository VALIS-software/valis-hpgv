import { Strand } from "gff3/Strand";

/**
 * Should be plain-old-data and easy to serialize
 * - Should encapsulate complete state, excluding transitive UI state
 * - Applying a TrackModel state should restore state exactly
 */

export type TrackModel<TrackType extends keyof TrackTypeMap = keyof TrackTypeMap> = 
    {
        type: TrackType;
        name: string;
    } & TrackTypeMap[TrackType]

export interface TrackTypeMap {
    'empty': {};
    'sequence': {};
    'annotation': {
        strand: Strand,
    };
    'variant': {
        query?: any
    },
    'interval': {
        query: any,
        tileStoreType: string,
        blendEnabled: boolean,
    },
}

export default TrackModel;