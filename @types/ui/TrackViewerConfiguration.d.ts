import GenomicLocation from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";
export interface TrackViewerConfiguration {
    panels: Array<{
        location: GenomicLocation;
        width?: number;
    }>;
    tracks: Array<TrackModel>;
    allowNewPanels?: boolean;
}
export default TrackViewerConfiguration;
