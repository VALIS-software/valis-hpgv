import "@babel/polyfill";
import React = require("react");
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { InternalDataSource } from "../data-source/InternalDataSource";
import { GenomicLocation } from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";
import TrackObject from "../track/TrackObject";
import ReactObject from "./core/ReactObject";
import Panel from "./Panel";
import TrackViewerConfiguration from "./TrackViewerConfiguration";
import { StyleProxy } from "./util/StyleProxy";
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
    protected _removableTracks: boolean;
    protected reorderTracks: boolean;
    protected panels: Set<Panel>;
    protected tracks: Track[];
    protected panelEdges: number[];
    protected rowOffsetY: number;
    /** used to collectively position panels and track tiles */
    protected grid: Object2D;
    protected addPanelButton: ReactObject;
    protected dataSource: InternalDataSource;
    protected masks: Object2D[];
    protected nothingToDisplay: Text;
    protected panelStyleProxy: StyleProxy;
    protected trackStyleProxies: {
        [trackType: string]: StyleProxy;
    };
    protected highlightLocation: string;
    constructor();
    setConfiguration(state: TrackViewerConfiguration): void;
    getConfiguration(): TrackViewerConfiguration;
    setDataSource(dataSource: InternalDataSource): void;
    addTrack(model: TrackModel, animate: boolean, highlightLocation: string): Track;
    closeTrack(track: Track, animate?: boolean, onComplete?: () => void): void;
    setTrackIndex(track: Track, indexParam: number, animate?: boolean): void;
    moveTrackUp(track: Track, animate?: boolean): void;
    moveTrackDown(track: Track, animate?: boolean): void;
    addPanel(location: GenomicLocation, animate?: boolean, highlightLocation?: string): void;
    closePanel(panel: Panel, animate?: boolean, onComplete?: () => void): void;
    getTracks(): Track[];
    getPanels(): Set<Panel>;
    setNothingToDisplayText(string: string): void;
    resetNothingToDisplayText(): void;
    refreshStyle(): void;
    getStyleNodes(): React.ReactNode[];
    getContentHeight(): number;
    protected createTrackObject(model: TrackModel, panel: Panel, rowObject: RowObject): void;
    protected setTrackStyleNode(trackType: string, node: HTMLElement): void;
    protected setPanelStyleNode(node: HTMLElement): void;
    protected refreshTrackStyle(type: string): void;
    protected refreshPanelStyle(): void;
    protected onPanelsChanged(): void;
    protected setRemovableTracks(state: boolean): void;
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
    protected getTotalRowHeight(): number;
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
        style: React.CSSProperties;
    }): JSX.Element;
    static TrackHeader(props: {
        model: TrackModel;
        expandable: boolean;
        reorder: boolean;
        setExpanded?: (state: boolean) => void;
        moveUp: () => void;
        moveDown: () => void;
        isExpanded: boolean;
        style?: React.CSSProperties;
    }): JSX.Element;
    static AddPanelButton(props: {
        onClick: () => void;
    }): JSX.Element;
}
export declare class Track {
    readonly model: TrackModel;
    protected _heightPx: number;
    protected onFieldsChanged: (name: keyof Track) => void;
    readonly closing: boolean;
    heightPx: number;
    opacity: number;
    protected rowObject: RowObject;
    protected _opacity: number;
    constructor(model: TrackModel, _heightPx: number, onFieldsChanged: (name: keyof Track) => void);
    applyStyle(styleProxy: StyleProxy): void;
}
/**
 * RowObject is a pseudo Object2D used to layout a set of tracks vertically
 * Internal to TrackViewer
 */
declare class RowObject {
    protected model: TrackModel;
    protected readonly defaultHeightPx: number;
    protected readonly defaultExpandable: boolean;
    protected readonly spacing: {
        x: number;
        y: number;
    };
    protected onClose: (t: RowObject) => void;
    protected onMoveUp: (t: RowObject) => void;
    protected onMoveDown: (t: RowObject) => void;
    protected readonly setHeight: (h: number) => void;
    protected readonly getHeight: () => number;
    reorder: boolean;
    readonly header: ReactObject;
    readonly closeButton: ReactObject;
    readonly resizeHandle: Rect;
    readonly trackViews: Set<TrackObject<TrackModel, import("../track/TileLoader").TileLoader<any, any>>>;
    y: number;
    h: number;
    opacity: number;
    title: string;
    protected _y: number;
    protected _h: number;
    protected _opacity: number;
    protected _headerIsExpandedState: boolean | undefined;
    protected styleProxy: StyleProxy;
    protected interactionDisabled: boolean;
    protected readonly expandedTrackHeightPx: number;
    constructor(model: TrackModel, defaultHeightPx: number, defaultExpandable: boolean, spacing: {
        x: number;
        y: number;
    }, onClose: (t: RowObject) => void, onMoveUp: (t: RowObject) => void, onMoveDown: (t: RowObject) => void, setHeight: (h: number) => void, getHeight: () => number, reorder: boolean);
    setResizable(v: boolean): void;
    addTrackView(trackView: TrackObject): void;
    removeTrackView(trackView: TrackObject): void;
    applyStyle(styleProxy: StyleProxy): void;
    disableInteraction(): void;
    protected syncTrackViews(): void;
    protected syncTrackView(trackView: TrackObject): void;
    /**
     * A TrackRow isn't an Object2D so we manually layout track elements with the track row's y and height
     */
    protected layoutY(): void;
    protected updateHeader(): void;
    protected isExpanded: () => boolean;
}
export default TrackViewer;
