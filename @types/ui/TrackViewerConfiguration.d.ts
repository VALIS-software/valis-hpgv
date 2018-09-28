import GenomicLocation from "../model/GenomicLocation";
import TrackModel from "../model/TrackModel";
export interface PanelConfiguration {
    location: GenomicLocation;
    width?: number;
}
export interface TrackConfiguration {
    model: TrackModel;
    heightPx?: number;
}
export interface TrackViewerConfiguration {
    panels: Array<PanelConfiguration>;
    tracks: Array<TrackConfiguration>;
}
export default TrackViewerConfiguration;
