import GenomicLocation from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";
export interface TrackViewerConfiguration {
    panels: Array<{
        location: GenomicLocation;
        width?: number;
    }>;
    tracks: Array<TrackModel>;
    /**
     * When true a button to create a new panel will be visible
     * Default `false`
     */
    allowNewPanels?: boolean;
    /**
     * When true tracks will have a close button attached
     * Default `true`
     */
    removableTracks?: boolean;
    /**
     * Prevent the user zooming out beyond available data
     * Default `false`
     */
    clampToTracks?: boolean;
    highlightLocation?: string;
}
export default TrackViewerConfiguration;
