import GenomicLocation from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";

export interface TrackViewerConfiguration {
    panels: Array<{
        location: GenomicLocation,
        width?: number
    }>,
    tracks: Array<TrackModel>,
    
    // defaults to false
    allowNewPanels?: boolean,
    clampToTracks?: boolean,
}

export default TrackViewerConfiguration;