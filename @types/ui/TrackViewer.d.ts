/// <reference types="react" />
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import { InternalDataSource } from "../data-source/InternalDataSource";
import { GenomicLocation } from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";
import TrackObject from "../track/TrackObject";
import ReactObject from "./core/ReactObject";
import Panel from "./Panel";
import TrackViewerConfiguration from "./TrackViewerConfiguration";
export declare class TrackViewer extends Object2D {
    readonly trackHeaderWidth: number;
    readonly panelHeaderHeight: number;
    readonly trackButtonWidth: number;
    readonly spacing: {
        x: number;
        y: number;
    };
    readonly xAxisHeight: number;
    readonly minPanelWidth: number;
    readonly minTrackHeight: number;
    protected allowNewPanels: boolean;
    protected panels: Set<Panel>;
    protected tracks: Track[];
    protected panelEdges: number[];
    protected rowOffsetY: number;
    /** used to collectively position panels and track tiles */
    protected grid: Object2D;
    protected addPanelButton: ReactObject;
    protected dataSource: InternalDataSource;
    constructor();
    addTrack(model: TrackModel, animate?: boolean): Track;
    closeTrack(track: Track, animate?: boolean, onComplete?: () => void): void;
    addPanel(location: GenomicLocation, animate?: boolean): void;
    closePanel(panel: Panel, animate?: boolean, onComplete?: () => void): void;
    setDataSource(dataSource: InternalDataSource): void;
    getConfiguration(): TrackViewerConfiguration;
    setConfiguration(state: TrackViewerConfiguration): void;
    getTracks(): Track[];
    getPanels(): Set<Panel>;
    /**
     * Removes the row from the scene and cleans up resources
     *
     * **Should only be called after closeTrackRow**
     */
    protected deleteTrack: (track: Track) => void;
    protected deleteRowObject: (rowObject: RowObject) => void;
    /**
     * Removes the panel from the scene and cleans up resources
     *
     * **Should only be called after closePanel**
     */
    protected deletePanel: (panel: Panel) => void;
    protected layoutPanels(animate: boolean, singlePanelOnly?: Panel): void;
    protected layoutTrackRows(animate: boolean, singleTrackRowOnly?: RowObject): void;
    /**
     * Remove a column from a set of edges in a physically natural way; the edges either side together as if either side was expanding under spring forces to fill the empty space
     */
    protected removeColumn(edges: Array<number>, index: number): boolean;
    protected onAdded(): void;
    protected onRemoved(): void;
    protected onAnimationStep: () => void;
    protected layoutGridContainer(): void;
    protected applyOverflowLimits(): void;
    protected onResize: (e: Event) => void;
    protected initializeDragPanning(): void;
    private _resizingPanels;
    private _resizingTracks;
    /**
     * Setup event listeners to enable resizing of panels and tracks
     */
    protected initializeGridResizing(): void;
    protected startResizingPanel(panel: Panel): void;
    protected endResizingPanel(panel: Panel): void;
    protected startResizingTrack(track: Track): void;
    protected endResizingTrack(track: Track): void;
    static TrackCloseButton(props: {
        onClick: (track: RowObject) => void;
        track: RowObject;
    }): JSX.Element;
    static TrackHeader(props: {
        model: TrackModel;
        setExpanded?: (state: boolean) => void;
        isExpanded: boolean;
    }): JSX.Element;
    static AddPanelButton(props: {
        onClick: () => void;
    }): JSX.Element;
}
export declare class Track {
    readonly model: TrackModel;
    protected _heightPx: number;
    protected onHeightChanged: () => void;
    readonly closing: boolean;
    heightPx: number;
    protected rowObject: RowObject;
    constructor(model: TrackModel, _heightPx: number, onHeightChanged: () => void);
}
/**
 * RowObject is a pseudo Object2D used to layout a set of tracks vertically
 * Internal to TrackViewer
 */
declare class RowObject {
    protected model: TrackModel;
    protected readonly spacing: {
        x: number;
        y: number;
    };
    protected onClose: (t: RowObject) => void;
    protected readonly setHeight: (h: number) => void;
    protected readonly getHeight: () => number;
    readonly header: ReactObject;
    readonly closeButton: ReactObject;
    readonly resizeHandle: Rect;
    readonly trackViews: Set<TrackObject<TrackModel, import("../track/TileLoader").TileLoader<any, any>>>;
    y: number;
    h: number;
    title: string;
    protected _y: number;
    protected _h: number;
    protected _headerIsExpandedState: boolean | undefined;
    constructor(model: TrackModel, spacing: {
        x: number;
        y: number;
    }, onClose: (t: RowObject) => void, setHeight: (h: number) => void, getHeight: () => number);
    setResizable(v: boolean): void;
    addTrackView(trackView: TrackObject): void;
    removeTrackView(trackView: TrackObject): void;
    /**
     * A TrackRow isn't an Object2D so we manually layout track elements with the track row's y and height
     */
    protected layoutY(): void;
    protected updateHeader(): void;
    protected isExpanded: () => boolean;
    static readonly expandedTrackHeight: number;
    static readonly collapsedTrackHeight: number;
}
export default TrackViewer;
