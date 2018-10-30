import GenomicLocation from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";
export interface TrackViewerConfiguration {
    panels: Array<{
        location: GenomicLocation;
        width?: number;
    }>;
    tracks: Array<TrackModel>;
}
export default TrackViewerConfiguration;
