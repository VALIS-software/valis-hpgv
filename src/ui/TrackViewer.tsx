/*

Dev notes:

    Refactor plans:
        - Improve how tracks and panels are laid out; should not need to manually call layout after each change
        - Panels should be an array not a set
*/

import "@babel/polyfill";
import React = require("react");
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import CloseIcon from "@material-ui/icons/Close";
import ArrowDropUpIcon from "@material-ui/icons/ArrowDropUp";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import Animator from "../Animator";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { InternalDataSource } from "../data-source/InternalDataSource";
import GenomeVisualizer from "../GenomeVisualizer";
import { GenomicLocation } from "../model/GenomicLocation";
import TrackModel from "../track/TrackModel";
import TrackObject from "../track/TrackObject";
import ReactObject from "./core/ReactObject";
import Panel, { PanelInternal } from "./Panel";
import TrackViewerConfiguration from "./TrackViewerConfiguration";
import { DEFAULT_SPRING } from "./UIConstants";
import { MadaRegular } from "./font";
import { StyleProxy } from "./util/StyleProxy";
import { TrackEvent } from "../track/TrackEvent";


// Icons to collapse and expand track header.
const ExpandLessIcon = () => (
    <svg version="1.1" focusable="false" viewBox="0 0 12 7.4">
        <path d="M6,0L0,6l1.4,1.4L6,2.8l4.6,4.6L12,6L6,0z"/>
    </svg>
);

const ExpandMoreIcon = () => (
    <svg version="1.1" focusable="false" viewBox="0 0 12 7.4">
        <path d="M10.6,0L6,4.6L1.4,0L0,1.4l6,6l6-6L10.6,0z"/>
    </svg>
);


export class TrackViewer extends Object2D {

    // layout settings
    readonly trackHeaderWidth: number = 180;
    readonly panelHeaderHeight: number = 50;
    readonly trackButtonWidth: number = 50;

    readonly spacing = {
        x: 5,
        y: 5
    };
    readonly xAxisHeight = 40; // height excluding spacing
    readonly minPanelWidth = 35;
    readonly minTrackHeight = 35;

    protected allowNewPanels = true;
    protected _removableTracks = true; // use setRemovableTracks
    protected reorderTracks = false;
    protected panels = new Set<Panel>();
    protected tracks = new Array<Track>();

    protected panelEdges = new Array<number>();
    protected rowOffsetY: number = 0;

    /** used to collectively position panels and track tiles */
    protected grid: Object2D;
    protected addPanelButton: ReactObject;

    protected dataSource: InternalDataSource;

    protected masks = new Array<Object2D>();
    protected nothingToDisplay: Text;

    protected panelStyleProxy: StyleProxy;
    protected trackStyleProxies: { [trackType: string]: StyleProxy } = {};

    protected highlightLocation: string;

    constructor() {
        super();

        this.render = false;

        // fill parent dimensions
        this.relativeW = 1;
        this.relativeH = 1;

        this.grid = new Rect(0, 0, [0.9, 0.9, 0.9, 1]); // grid is Rect type for debug display
        this.grid.render = false;
        this.add(this.grid);

        this.initializeDragPanning();
        this.initializeGridResizing();

        this.addPanelButton = new ReactObject(
            <TrackViewer.AddPanelButton onClick={() => {
                this.addPanel({ contig: 'chr1', x0: 0, x1: 249e6}, true);
            }} />,
            this.panelHeaderHeight,
            this.trackButtonWidth,
        );
        this.addPanelButton.x =  this.spacing.x * 0.5;
        this.addPanelButton.containerStyle = {
            zIndex: 3,
        }
        this.addPanelButton.relativeX = 1;
        this.addPanelButton.originY = -1;
        this.addPanelButton.y = -this.xAxisHeight - this.spacing.x * 0.5;
        this.grid.add(this.addPanelButton);

        const maskStyle = {
            backgroundColor: '#fff',
            zIndex: 2,
            width: '100%',
            height: '100%',
        }

        const leftTrackMask = new ReactObject(<div style={maskStyle}/>, this.trackHeaderWidth  + this.spacing.x, this.panelHeaderHeight + this.xAxisHeight - 0.5 * this.spacing.y);

        const rightTrackMask = new ReactObject(<div style={maskStyle} />, this.panelHeaderHeight + 1.5 * this.spacing.x, this.panelHeaderHeight + this.xAxisHeight - 0.5 * this.spacing.y);
        rightTrackMask.relativeX = 1;
        rightTrackMask.originX = -1;

        this.masks = [leftTrackMask, rightTrackMask];

        // nothing to display text
        this.nothingToDisplay = new Text(MadaRegular, '', 20, [0.6, 0.6, 0.6, 1.0]);
        this.nothingToDisplay.z = 10;
        // center
        this.nothingToDisplay.originX = -0.5;
        this.nothingToDisplay.originY = -0.5;
        this.nothingToDisplay.relativeX = 0.5;
        this.nothingToDisplay.relativeY = 0.5;
        this.resetNothingToDisplayText();

        window.addEventListener('resize', this.onResize);

        // initialize with empty configuration
        this.setConfiguration({
            panels: [],
            tracks: [],
        });
    }

    setConfiguration(state: TrackViewerConfiguration) {
        let panels = state.panels || [];

        // hide/show add panel button
        let clampToTracks = state.clampToTracks = !!state.clampToTracks;
        this.allowNewPanels = state.allowNewPanels = !!state.allowNewPanels;
        this.reorderTracks = state.reorderTracks = !!state.reorderTracks;
        this.setRemovableTracks(state.removableTracks = !!state.removableTracks);
        this.grid.toggleChild(this.addPanelButton, this.allowNewPanels);

        // Panels
        // clear current panels
        let currentPanels = new Set(this.panels);
        for (let panel of currentPanels) {
            this.closePanel(panel, false);
        }

        // clear current tracks
        let currentTracks = new Set(this.tracks);
        for (let track of currentTracks) {
            this.closeTrack(track, false);
        }

        // create panels
        for (let i = 0; i < panels.length; i++) {
            let panelState = panels[i];
            this.addPanel(panelState.location, false);
        }

        // determine what width to set panels that have no width specified
        let unassignedWidthRemaining = 1;
        let unassignedWidthCount = 0;
        for (let i = 0; i < panels.length; i++) {
            let panelState = panels[i];
            if (panelState.width != null) {
                unassignedWidthRemaining -= panelState.width;
            } else {
                unassignedWidthCount++;
            }
        }
        let unassignedWidthPanel = unassignedWidthRemaining / unassignedWidthCount;

        // set panel edges from state widths
        let e = 0;
        for (let i = 0; i < panels.length; i++) {
            let panelState = panels[i];
            this.panelEdges[i] = e;

            if (panelState.width != null) {
                e += panelState.width;
            } else {
                e += unassignedWidthPanel;
            }
        }

        this.layoutPanels(false);

        // create rows
        if (state.tracks != null) {
            for (let track of state.tracks) {
                this.addTrack(track, false, state.highlightLocation);
            }
        }

        // apply clampToTracks
        for (let panel of this.panels) {
            panel.clampToTracks = clampToTracks;
        }

        this.layoutTrackRows(false);

        this.layoutGridContainer();

        this.onPanelsChanged();
    }

    getConfiguration(): TrackViewerConfiguration {
        let clampToTracks = false;
        let panels: TrackViewerConfiguration['panels'] = new Array();
        for (let panel of this.panels) {
            clampToTracks = panel.clampToTracks;
            let width = this.panelEdges[panel.column + 1] - this.panelEdges[panel.column];
            panels.push({
                location: {
                    contig: panel.contig,
                    x0: panel.x0,
                    x1: panel.x1,
                },
                width: width,
            });
        }

        let tracks: TrackViewerConfiguration['tracks'] = new Array();
        for (let track of this.tracks) {
            tracks.push({
                ...track.model,
                heightPx: track.heightPx,
            });
        }

        return {
            allowNewPanels: this.allowNewPanels,
            removableTracks: this._removableTracks,
            reorderTracks: this.reorderTracks,
            clampToTracks: clampToTracks,
            panels: panels,
            tracks: tracks,
        }
    }

    setDataSource(dataSource: InternalDataSource) {
        this.dataSource = dataSource;
        for (let panel of this.panels) {
            panel.setDataSource(dataSource);
        }
    }

    // track-viewer state deltas
    addTrack(model: TrackModel, animate: boolean = true, highlightLocation: string): Track {
        let trackClasses = GenomeVisualizer.getTrackType(model.type);

        model.highlightLocation = highlightLocation;

        trackClasses.tileLoaderClass.getAvailableContigs(model).then(contigs => {
            for(let contig of contigs) this.dataSource.addContig(contig);

            // if no panels have been specified, create one from the first available contig
            if (this.panels.size === 0) {
                this.dataSource.getContigs().then(contigs => {
                    if (contigs.length > 0 && this.panels.size === 0) {
                        this.addPanel({
                            contig: contigs[0].id,
                            x0: contigs[0].startIndex,
                            x1: contigs[0].startIndex + contigs[0].span
                        }, false);
                    }
                });
            }
        })

        let defaultTrackHeight = trackClasses.trackObjectClass.getDefaultHeightPx != null ? trackClasses.trackObjectClass.getDefaultHeightPx(model) : 100;
        let expandable = trackClasses.trackObjectClass.getExpandable != null ? trackClasses.trackObjectClass.getExpandable(model) : true;
        let heightPx = model.heightPx != null ? model.heightPx : defaultTrackHeight;

        // create a track and add the header element to the grid
        let track: Track = new Track(
            model,
            heightPx,
            (name) => {
                if (name === 'heightPx') {
                    this.emit('track-resize', track);
                }
                this.layoutTrackRows(true);
            }
        );

        let rowObject = new RowObject(
            model,
            heightPx,
            expandable,
            this.spacing,
            () => this.closeTrack(track),
            () => this.moveTrackUp(track),
            () => this.moveTrackDown(track),
            (h: number) => track.heightPx = h,
            (): number => track.heightPx,
            this.reorderTracks
        );

        (track as any as TrackInternal).rowObject = rowObject;

        // add track tile to all panels
        for (let panel of this.panels) {
            this.createTrackObject(model, panel, rowObject);
        }

        let styleProxy = this.trackStyleProxies[track.model.type];
        if (styleProxy) {
            track.applyStyle(styleProxy);
        }

        this.tracks.push(track);

        rowObject.closeButton.relativeX = 1;
        rowObject.closeButton.x = -this.spacing.x;
        rowObject.closeButton.w = 50;
        rowObject.header.x = -this.trackHeaderWidth + this.spacing.x * 0.5;
        rowObject.header.w = this.trackHeaderWidth;

        // position the resize handle to span the full width of the viewer
        rowObject.resizeHandle.relativeW = 1;
        rowObject.resizeHandle.x = -this.trackHeaderWidth;
        rowObject.resizeHandle.w = this.trackHeaderWidth;

        rowObject.resizeHandle.addInteractionListener('dragstart', (e) => {
            if (e.isPrimary && e.buttonState === 1) {
                e.preventDefault();
                this.startResizingTrack(track);
            }
        });
        rowObject.resizeHandle.addInteractionListener('dragend', (e) => {
            if (e.isPrimary) {
                e.preventDefault();
                this.endResizingTrack(track);
            }
        });

        rowObject.setResizable(true);

        this.grid.add(rowObject.header);
        this.grid.add(rowObject.resizeHandle);

        if (this._removableTracks) {
            this.grid.add(rowObject.closeButton);
        }

        // first instantaneously the y position of the track and override h to 0
        this.layoutTrackRows(false, rowObject);
        rowObject.h = 0;

        // then animate all the tracks to the new layout
        this.layoutTrackRows(animate);

        return track;
    }

    closeTrack(track: Track, animate: boolean = true, onComplete: () => void = () => {}) {
        // first set height to 0, when the animation is complete, remove the row's resources
        if (this.tracks.indexOf(track) === -1) return; // this trackRow has already been removed

        let trackInternal = track as any as TrackInternal;

        let rowObject = trackInternal.rowObject;

        if (trackInternal.closing) {
            return;
        }

        track.opacity = 0;
        trackInternal.closing = true;
        rowObject.disableInteraction();

        rowObject.setResizable(false);

        this.endResizingTrack(track);

        // animate height to 0 and delete the row when complete
        track.heightPx = 0;

        if (animate) {
            Animator.addAnimationCompleteCallback(rowObject, 'h', () => {
                this.deleteTrack(track);
                onComplete();
            }, true);
        } else {
            Animator.stop(rowObject);
            this.deleteTrack(track);
            onComplete();
        }

        this.layoutTrackRows(animate);
    }

    setTrackIndex(track: Track, indexParam: number, animate = true) {
        // re-orders tracks in this.tracks[] and then calls this.layoutTrackRows(animate);

        // apply array bounds check
        const index: number = Math.min(Math.max(indexParam, 0), this.tracks.length - 1);

        let currentIndex = this.tracks.indexOf(track);

        // remove from tracks[] array (index -1 is fine and does nothing)
        this.tracks.splice(currentIndex, 1);

        // insert at index
        this.tracks.splice(index, 0, track);

        // now this.tracks[] has been changed, let's re-layout the tracks
        this.layoutTrackRows(animate);
    }

    moveTrackUp(track: Track, animate = true) {
        let currentIndex = this.tracks.indexOf(track);
        if (currentIndex !== -1) {
            this.setTrackIndex(track, currentIndex - 1, animate);
        }
    }

    moveTrackDown(track: Track, animate = true) {
        let currentIndex = this.tracks.indexOf(track);
        if (currentIndex !== -1) {
            this.setTrackIndex(track, currentIndex + 1, animate);
        }
    }

    addPanel(location: GenomicLocation, animate: boolean = true, highlightLocation?: string) {
        let edges = this.panelEdges;
        let newColumnIndex = Math.max(edges.length - 1, 0);

        // add a new column edge, overflow the grid so the panel extends off the screen
        if (edges.length === 0) edges.push(0);
        let newWidth = newColumnIndex == 0 ? 1 : 1 / newColumnIndex;
        let newEdge = 1 + newWidth;
        edges.push(newEdge);


        // create panel object and add header to the scene graph
        let panel = new Panel((p) => this.closePanel(p, true), this.spacing, this.panelHeaderHeight, this.xAxisHeight, this.dataSource);
        panel.setContig(location.contig);
        panel.setRange(location.x0, location.x1);
        panel.column = newColumnIndex; // @! should use array of panels instead of column field
        panel.relativeH = 1; // fill the full grid height
        this.grid.add(panel);

        if (this.panelStyleProxy != null) {
            panel.applyStyle(this.panelStyleProxy);
        }

        // initialize tracks for this panel
        for (let track of this.tracks) {
            this.createTrackObject(track.model, panel, (track as any as TrackInternal).rowObject);
        }

        this.panels.add(panel);
        this.onPanelsChanged();

        panel.resizeHandle.addInteractionListener('dragstart', (e) => {
            if (e.isPrimary && e.buttonState === 1) {
                e.preventDefault();
                this.startResizingPanel(panel);
            }
        });
        panel.resizeHandle.addInteractionListener('dragend', (e) => {
            if (e.isPrimary) {
                e.preventDefault();
                this.endResizingPanel(panel);
            }
        });

        panel.addEventListener('axisPointerUpdate', (axisPointers) => {
            for (let p of this.panels) {
                if (p === panel) continue;
                (p as any as PanelInternal).setSecondaryAxisPointers(axisPointers);
            }
        });

        // set initial position
        this.layoutPanels(false, panel);

        // scale the edges down to fit within the grid space
        let multiplier = 1 / newEdge;
        for (let e = 0; e < edges.length; e++) {
            edges[e] *= multiplier;
        }

        this.layoutPanels(animate);
    }

    closePanel(panel: Panel, animate: boolean = true, onComplete: () => void = () => {}){
        if (panel.closing) {
            return;
        }

        let edges = this.panelEdges;

        panel.closing = true;

        // if the panel is being resized, stop it
        this.endResizingPanel(panel);

        // remove column from edges
        this.removeColumn(edges, panel.column);

        // update column indexes of remaining panels
        for (let p of this.panels) {
            if (p.column > panel.column) {
                p.column = p.column - 1;
            }
        }

        this.layoutPanels(animate);

        // animate panel's width to 0, after which delete the panel
        if (animate) {
            Animator.addAnimationCompleteCallback(panel, 'relativeW', () => {
                this.deletePanel(panel);
                onComplete();
            }, true);
            Animator.springTo(panel, { relativeW: 0 }, DEFAULT_SPRING);
        } else {
            Animator.stop(panel);
            this.deletePanel(panel);
            onComplete();
        }

        // clear edges if there's less then 2, this allows edges to be re-initialized
        if (edges.length < 2) {
            edges.length = 0;
        }
    }

    getTracks() {
        return this.tracks.slice();
    }

    getPanels() {
        return new Set(this.panels);
    }

    setNothingToDisplayText(string: string) {
        this.nothingToDisplay.string = string;
    }

    resetNothingToDisplayText() {
        this.nothingToDisplay.string = 'Loading';
    }

    refreshStyle() {
        this.refreshPanelStyle();

        // update style for tracks if any of the style attributes are changed
        for (let track of this.tracks) {
            let styleProxy = this.trackStyleProxies[track.model.type];
            if (styleProxy == null) continue;
            track.applyStyle(styleProxy);
        }
    }

    getStyleNodes() {
        // add style node for panel
        let styleNodes = new Array<React.ReactNode>([
            <div key="trackViewer-panel" className="hpgv_panel" ref={(node) => {
                this.setPanelStyleNode(node);
            }}></div>
        ]);

        // add track nodes
        for (let trackType of GenomeVisualizer.getTrackTypes()) {
            let trackObjectClass = GenomeVisualizer.getTrackType(trackType).trackObjectClass;

            styleNodes.push(
                <div key={trackType} className={`hpgv_track hpgv_track-${trackType}`} ref={(node) => {
                    this.setTrackStyleNode(trackType, node);
                }}>
                    {trackObjectClass.styleNodes}
                </div>
            );
        }

        return styleNodes;
    }

    getContentHeight() {
        return this.grid.y + this.getTotalRowHeight() + this.spacing.y;
    }

    protected createTrackObject(model: TrackModel, panel: Panel, rowObject: RowObject) {
        const trackObjectClass = GenomeVisualizer.getTrackType(model.type).trackObjectClass;
        let trackObject = new trackObjectClass(model);
        panel.addTrackView(trackObject);
        rowObject.addTrackView(trackObject);

        // unwrap and forward track events, so you can do, trackViewer.addEventListener(<track-event>, ...)
        trackObject.addEventListener('track-event', (eventData: TrackEvent) => {
            this.emit('track-event', eventData);
            this.emit(eventData.type, eventData);
        });
    }

    protected setTrackStyleNode(trackType: string, node: HTMLElement) {
        // end any existing style proxy callbacks
        if (this.trackStyleProxies[trackType] != null) {
            this.trackStyleProxies[trackType].removeAllObservers();
        }

        let styleProxy = this.trackStyleProxies[trackType] = new StyleProxy(node);

        styleProxy.observeAllStyle(() => this.refreshTrackStyle(trackType));
        this.refreshTrackStyle(trackType);
    }

    protected setPanelStyleNode(node: HTMLElement) {
        if (this.panelStyleProxy != null) {
            this.panelStyleProxy.removeAllObservers();
        }
        this.panelStyleProxy = new StyleProxy(node);
        this.panelStyleProxy.observeAllStyle(() => this.refreshPanelStyle());
        this.refreshPanelStyle();
    }

    protected refreshTrackStyle(type: string) {
        let styleProxy = this.trackStyleProxies[type];
        if (styleProxy == null) return;;
        for (let track of this.tracks) {
            if (track.model.type === type) {
                track.applyStyle(styleProxy);
            }
        }
    }

    protected refreshPanelStyle() {
        if (this.panelStyleProxy == null) return;
        for (let panel of this.panels) {
            panel.applyStyle(this.panelStyleProxy);
        }
    }

    protected onPanelsChanged() {
        // hide/show masks & nothing to display message
        let nothingToDisplay = this.panels.size === 0;

        this.toggleChild(this.nothingToDisplay, nothingToDisplay);

        // only show tracks and masks when showing panels and content
        this.toggleChild(this.grid, !nothingToDisplay);
        for (let mask of this.masks) {
            this.toggleChild(mask, !nothingToDisplay);
        }
    }

    protected setRemovableTracks(state: boolean) {
        this._removableTracks = state;
        for (let track of this.tracks) {
            let rowObject = (track as any as TrackInternal).rowObject;
            this.grid.toggleChild(rowObject.closeButton, this._removableTracks);
        }
        this.layoutGridContainer();
    }

    /**
     * Removes the row from the scene and cleans up resources
     *
     * **Should only be called after closeTrackRow**
     */
    protected deleteTrack = (track: Track) => {
        this.deleteRowObject((track as any as TrackInternal).rowObject);
        let i = this.tracks.indexOf(track);
        if (i !== -1) {
            this.tracks.splice(i, 1);
        }
    }

    protected deleteRowObject = (rowObject: RowObject) => {
        // remove trackRow elements from scene
        this.grid.remove(rowObject.header);
        this.grid.remove(rowObject.closeButton);
        this.grid.remove(rowObject.resizeHandle);

        // remove track tiles from panels and release resources
        for (let panel of this.panels) {
            for (let track of rowObject.trackViews) {
                panel.removeTrackView(track);
            }
        }

        // release track tile resources
        for (let trackView of rowObject.trackViews) {
            trackView.releaseGPUResources();
            rowObject.removeTrackView(trackView);
        }
    }

    /**
     * Removes the panel from the scene and cleans up resources
     *
     * **Should only be called after closePanel**
     */
    protected deletePanel = (panel: Panel) => {
        if (!panel.closing) {
            console.warn('cleanupPanel() called before closing the panel');
            this.closePanel(panel, false);
        }

        // remove from panel list
        if (!this.panels.has(panel)) {
            console.error('Cleanup executed twice on a panel');
            return;
        }

        this.panels.delete(panel);
        this.onPanelsChanged();

        // stop any active animations on the panel
        Animator.stop(panel);
        // remove any open cleanupPanel panel callbacks
        Animator.removeAnimationCompleteCallbacks(panel, 'relativeW', this.deletePanel);

        // remove the panel from the scene
        this.grid.remove(panel);

        // delete track tiles from the track
        // (we can leave them in the scene-graph of the panel and the GC should still cull them all)
        for (let trackView of panel.trackViews) {
            // destroy the track object
            trackView.releaseGPUResources();
            // remove track object from panel
            panel.remove(trackView);
            // remove track object from all track rows
            for (let track of this.tracks) {
                let rowObject = (track as any as TrackInternal).rowObject;
                rowObject.removeTrackView(trackView);
            }
        }

        panel.releaseGPUResources();

        // strictly we don't need to do this but listener bugs may prevent the GC from clearing the panel
        panel.removeAllListeners(true);
    }

    protected layoutPanels(animate: boolean, singlePanelOnly?: Panel) {
        // count open panels
        let openPanelCount = 0;
        for (let panel of this.panels) if (!panel.closing) openPanelCount++;

        // panels are only closable if more than 1 are open
        for (let panel of this.panels) {
            panel.closable = openPanelCount > 1;
            panel.setResizable(panel.column < (this.panelEdges.length - 2) && !panel.closing);

            // animate panels to column positions
            if (singlePanelOnly === undefined || (singlePanelOnly === panel)) {
                let edges = this.panelEdges;
                let relativeX = edges[panel.column];
                let relativeW = panel.closing ? 0 : edges[panel.column + 1] - edges[panel.column];
                if (animate) {
                    Animator.springTo(panel, { relativeX: relativeX, relativeW: relativeW }, DEFAULT_SPRING);
                } else {
                    Animator.stop(panel, ['relativeX', 'relativeW']);
                    panel.relativeX = relativeX;
                    panel.relativeW = relativeW;
                }
            }
        }
    }

    protected layoutTrackRows(animate: boolean, singleTrackRowOnly?: RowObject) {
        let y = 0;
        for (let track of this.tracks) {
            let h = track.heightPx;
            let rowObject = (track as any as TrackInternal).rowObject;
            if (singleTrackRowOnly === undefined || (singleTrackRowOnly === rowObject)) {
                if (animate) {
                    Animator.springTo(rowObject, { y: y, h: h, opacity: track.opacity }, DEFAULT_SPRING);
                } else {
                    Animator.stop(rowObject, ['y', 'h', 'opacity']);
                    rowObject.y = y + this.rowOffsetY;
                    rowObject.h = h;
                }
            }

            y += track.heightPx;
        }

        // we manually set the grid height since it doesn't automatically wrap to content
        this.grid.h = y + this.spacing.y * 0.5 + this.rowOffsetY;
    }

    /**
     * Remove a column from a set of edges in a physically natural way; the edges either side together as if either side was expanding under spring forces to fill the empty space
     */
    protected removeColumn(edges: Array<number>, index: number) {
        if (index >= edges.length || index < 0) return false;

        let leftmostEdge = edges[0];
        let rightmostEdge = edges[edges.length - 1];
        let leftEdge = edges[index];
        let rightEdge = edges[index + 1] || rightmostEdge;

        let lSpan = leftEdge - leftmostEdge;
        let rSpan = rightmostEdge - rightEdge;
        let totalSpan = rSpan + lSpan;

        // determine where the left and right edges should come together
        let relativeMergePoint = totalSpan == 0 ? 0.5 : (lSpan / totalSpan);
        let edgeMergeTarget = relativeMergePoint * (rightEdge - leftEdge) + leftEdge;

        // evenly redistribute all the edges ether side to fill the new space
        let newRSpan = rightmostEdge - edgeMergeTarget;
        let newLSpan = edgeMergeTarget - leftmostEdge;

        let rSpanMultiplier = rSpan == 0 ? 0 : newRSpan / rSpan;
        for (let i = index + 1; i < edges.length; i++) {
            edges[i] = edgeMergeTarget + (edges[i] - rightEdge) * rSpanMultiplier;
        }

        let lSpanMultiplier = newLSpan / lSpan;
        for (let i = 0; i < index; i++) {
            edges[i] = leftmostEdge + (edges[i] - leftmostEdge) * lSpanMultiplier;
        }

        // remove edge from list
        edges.splice(index, 1);

        return true;
    }

    protected onAdded() {
        super.onAdded();
        Animator.addStepCompleteCallback(this.onAnimationStep);
    }

    protected onRemoved() {
        super.onRemoved();
        Animator.removeStepCompleteCallback(this.onAnimationStep);
    }

    protected onAnimationStep = () => {
        let maxX = 1;
        for (let panel of this.panels) {
            maxX = Math.max(panel.relativeX + panel.relativeW, maxX);
        }
        this.addPanelButton.relativeX = maxX;
    }

    protected layoutGridContainer() {
        let trackButtonsVisible = this.allowNewPanels || this._removableTracks;

        this.grid.x = this.trackHeaderWidth + this.spacing.x * 0.5;
        this.grid.w =
            - this.trackHeaderWidth - this.spacing.x * 0.5
            // right-side buttons
            - (trackButtonsVisible ? (this.trackButtonWidth + this.spacing.x * 0.5) : 0)
        ;
        this.grid.relativeW = 1;
        this.grid.y = this.panelHeaderHeight + this.spacing.y * 0.5 + this.xAxisHeight;

        // (grid height is set dynamically when laying out tracks)
    }

    protected getTotalRowHeight() {
        // compute total row-height
        let rowHeight = 0;
        for (let row of this.tracks) {
            rowHeight += row.heightPx;
        }
        return rowHeight;
    }

    // limits rowOffsetY to only overflow region
    protected applyOverflowLimits() {
        let maxOffset = 0;

        // determine minOffset from grid overflow
        // assumes grid.h is up to date (requires calling layoutTrackRows(false))
        let trackViewerHeight = this.getComputedHeight();
        let gridViewportHeight = trackViewerHeight - this.grid.y;

        let totoalRowHeight = this.getTotalRowHeight();

        const padding = this.spacing.y;
        let overflow = totoalRowHeight - gridViewportHeight + padding;
        let minOffset = -overflow;

        this.rowOffsetY = Math.min(Math.max(this.rowOffsetY, minOffset), maxOffset);
    }

    protected onResize = (e: Event) => {
        this.applyOverflowLimits();
        this.layoutTrackRows(false);
    }

    protected initializeDragPanning() {
        let dragStartY: number = undefined;
        let yOffsetStart: number = undefined;
        this.addEventListener('dragstart', (e) => {
            dragStartY = e.localY;
            yOffsetStart = this.rowOffsetY;
        });

        this.addEventListener('dragmove', (e) => {
            if (this._resizingPanels.size > 0 || this._resizingTracks.size > 0) return;
            let dy = e.localY - dragStartY;

            this.rowOffsetY = yOffsetStart + dy;

            this.applyOverflowLimits();

            this.layoutTrackRows(false);
        });
    }

    // local state for grid-resizing
    private _resizingPanels = new Set<Panel>();
    private _resizingTracks = new Set<{
        track: Track,
        initialHeightPx: number
    }>();
    /**
     * Setup event listeners to enable resizing of panels and tracks
     */
    protected initializeGridResizing() {
        const draggedVEdges: {
            [i: number]: {
                i: number,
                p0: number,
                e0: number,
                obj: any,
            }
        } = {};

        let localY0 = 0;

        this.addInteractionListener('dragstart', (e) => {
            let resizing = (this._resizingPanels.size + this._resizingTracks.size) > 0;
            if (resizing) {
                e.preventDefault();
                e.stopPropagation();
            }

            for (let panel of this._resizingPanels) {
                let i = panel.column + 1;
                draggedVEdges[i] = {
                    i: i,
                    p0: e.fractionX,
                    e0: this.panelEdges[i],
                    obj: panel,
                }
            }

            if (e.isPrimary && e.buttonState === 1) {
                localY0 = e.localY;
            }
        });

        this.addInteractionListener('dragmove', (e) => {
            let resized = false;

            let resizing = (this._resizingPanels.size + this._resizingTracks.size) > 0;
            if (resizing) {
                e.preventDefault();
                e.stopPropagation();
            }

            for (let k in draggedVEdges) {
                let s = draggedVEdges[k];
                let dx = e.fractionX - s.p0;
                let gridWidthPx = this.grid.getComputedWidth();
                let minFWidth = this.minPanelWidth / gridWidthPx;
                let min = ((this.panelEdges[s.i - 1] + minFWidth) || 0);
                let max = ((this.panelEdges[s.i + 1] - minFWidth) || 1);
                this.panelEdges[s.i] = Math.min(Math.max(s.e0 + dx, min), max);

                for (let p of this.panels) {
                    if ((p.column === s.i) || (p.column === (s.i - 1))) {
                        this.layoutPanels(false, p);
                    }
                }

                resized = true;
            }

            if (e.isPrimary) {
                for (let entry of this._resizingTracks) {
                    let deltaY = e.localY - localY0;
                    entry.track.heightPx = Math.max(entry.initialHeightPx + deltaY, this.minTrackHeight);

                    resized = true;
                }
            }

            if (resized) {
                this.layoutTrackRows(false);

                for (let entry of this._resizingTracks) {
                    this.emit('track-resize', entry.track);
                }
            }
        });

        this.addInteractionListener('dragend', (e) => {
            // cleanup dragged edges state
            for (let k in draggedVEdges) {
                let s = draggedVEdges[k];
                if (!this._resizingPanels.has(s.obj)) {
                    delete draggedVEdges[k];
                }
            }
        });
    }

    protected startResizingPanel(panel: Panel) {
        this._resizingPanels.add(panel);
    }

    protected endResizingPanel(panel: Panel) {
        this._resizingPanels.delete(panel);
    }

    protected startResizingTrack(track: Track) {
        this._resizingTracks.add({
            track: track,
            initialHeightPx: track.heightPx,
        });

        this.emit('track-resize-start', track);
    }

    protected endResizingTrack(track: Track) {
        for (let entry of this._resizingTracks) {
            if (entry.track === track) {
                this._resizingTracks.delete(entry);
            }
        }

        this.applyOverflowLimits();
        this.layoutTrackRows(false);

        this.emit('track-resize-end', track);
    }

    public static TrackCloseButton(props: {
        onClick: (track: RowObject) => void,
        track: RowObject,
        style: React.CSSProperties,
    }) {
        return <div
            className="hpgv_ui-block hpgv_track-close-button"
            style={{
                position: 'relative',
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                userSelect: 'none',
                ...props.style
            }}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'right',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                <IconButton onClick={() => props.onClick(props.track)} color='inherit'>
                    <CloseIcon /*colorPrimary='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)'*/ />
                </IconButton>
            </div>
        </div>
    }

    public static TrackHeader(props: {
        model: TrackModel,
        expandable: boolean,
        reorder: boolean,
        setExpanded?: (state: boolean) => void,
        moveUp: () => void,
        moveDown: () => void,
        isExpanded: boolean,
        style?: React.CSSProperties
    }) {
        const iconSize = 16;
        const margin = 8;

        const ArrowElem = props.isExpanded ? ExpandLessIcon : ExpandMoreIcon;

        return <div
            className="hpgv_ui-block hpgv_track-header"
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                ...props.style,
            }}
        >
            {props.reorder ?
                <div
                    className="hpgv_track-reorder-container"
                    style={{
                        position: 'absolute',
                        display: 'block',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <div
                        className="hpgv_track-reorder-button move-up"
                        onClick={() => props.moveUp()}
                        style={{
                            position:'absolute',
                            top: 0,
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                    >
                        {<ArrowDropUpIcon ></ArrowDropUpIcon>}
                    </div>
                    <div
                        className="hpgv_track-reorder-button move-down"
                        onClick={() => props.moveDown()}
                        style={{
                            position:'absolute',
                            bottom: 0,
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            userSelect: 'none',
                        }
                    }>
                        {<ArrowDropDownIcon></ArrowDropDownIcon>}
                    </div>
                </div>
                : ''
            }
            <div>{props.isExpanded && props.model.longname ? props.model.longname : props.model.name}</div>
            {
                props.expandable ? (
                    <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={props.isExpanded}
                        onClick={(e) => {
                            if (e.altKey) {
                                const ariaExpanded = (e.currentTarget as HTMLElement).getAttribute('aria-expanded');
                                const elements = Array.from(document.querySelectorAll('.hpgv_track-expander'))
                                    .filter(element => element.getAttribute('aria-expanded') === ariaExpanded) as HTMLElement[];
                                elements.forEach(element => {
                                    element.click();
                                });
                            } else {
                                props.setExpanded(!props.isExpanded);
                            }
                        }}
                        onKeyDown={(e) => {
                        if (e.keyCode === 13 || e.keyCode === 32) {
                                props.setExpanded(!props.isExpanded);
                                e.preventDefault();
                            }
                        }}
                        className="hpgv_track-expander"
                    >
                        <ArrowElem />
                    </div>
                ) : null
            }
        </div>
    }

    public static AddPanelButton(props: {
        onClick: () => void,
    }) {
        return <div
            className="hpgv_ui-block hpgv_track-add-button"
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
            }}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'right',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                <IconButton onClick={props.onClick} color="inherit">
                    <AddIcon />
                </IconButton>
            </div>
        </div>
    }

}

interface TrackInternal {
    closing: boolean;
    rowObject: RowObject;
}

export class Track {

    readonly closing: boolean = false;

    set heightPx(v: number) {
        this._heightPx = v;
        this.onFieldsChanged('heightPx');
    }

    get heightPx() {
        return this._heightPx;
    }

    set opacity(v: number) {
        this._opacity = v;
        this.onFieldsChanged('opacity');
    }

    get opacity() {
        return this._opacity;
    }

    protected rowObject: RowObject;
    protected _opacity: number = 1.0;

    constructor(
        readonly model: TrackModel,
        protected _heightPx: number,
        protected onFieldsChanged: (name: keyof Track) => void
    ) {
    }

    applyStyle(styleProxy: StyleProxy) {
        this.rowObject.applyStyle(styleProxy);
    }

}

/**
 * RowObject is a pseudo Object2D used to layout a set of tracks vertically
 * Internal to TrackViewer
 */
class RowObject {

    readonly header: ReactObject;
    readonly closeButton: ReactObject;
    readonly resizeHandle: Rect;
    readonly trackViews = new Set<TrackObject>();

    get y(): number { return this._y; }
    get h(): number { return this._h; }

    set y(v: number) { this._y = v; this.layoutY(); }
    set h(v: number) {
        this._h = v;
        this.layoutY();
    }

    set opacity(v: number) {
        this._opacity = v;
        this.syncTrackViews();
        this.updateHeader();
    }
    get opacity() {
        return this._opacity;
    }

    get title() {
        return this.model.name;
    }

    set title(v: string) {
        this.model.name = v;
        this.updateHeader();
    }

    protected _y: number;
    protected _h: number;
    protected _opacity: number = 1.0;

    protected _headerIsExpandedState: boolean | undefined = undefined;
    protected styleProxy: StyleProxy;
    protected interactionDisabled: boolean = false;
    protected readonly expandedTrackHeightPx: number;

    constructor(
        protected model: TrackModel,
        protected readonly defaultHeightPx: number,
        protected readonly defaultExpandable: boolean,
        protected readonly spacing: { x: number, y: number },
        protected onClose: (t: RowObject) => void,
        protected onMoveUp: (t: RowObject) => void,
        protected onMoveDown: (t: RowObject) => void,
        protected readonly setHeight: (h: number) => void,
        protected readonly getHeight: () => number,
        public reorder: boolean,
    ) {
        this.header = new ReactObject();
        this.closeButton = new ReactObject();

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.h = this.spacing.y;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);

        this.expandedTrackHeightPx = this.model.expandedHeightPx != null ? this.model.expandedHeightPx : (defaultHeightPx * 2);

        this.updateHeader();
    }

    setResizable(v: boolean) {
        this.resizeHandle.cursorStyle = v ? 'row-resize' : null;
        this.resizeHandle.color = (v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    addTrackView(trackView: TrackObject) {
        this.trackViews.add(trackView);
        this.syncTrackView(trackView);
        this.layoutY();
    }

    removeTrackView(trackView: TrackObject) {
        this.trackViews.delete(trackView);
    }

    applyStyle(styleProxy: StyleProxy) {
        this.styleProxy = styleProxy;

        this.syncTrackViews();
    }

    disableInteraction() {
        this.interactionDisabled = false;
        this.updateHeader();
    }

    protected syncTrackViews() {
        for (let view of this.trackViews) {
            this.syncTrackView(view);
        }
    }

    protected syncTrackView(trackView: TrackObject) {
        if (this.styleProxy != null) {
            trackView.applyStyle(this.styleProxy);
        }
        trackView.opacity = this.opacity;
    }

    /**
     * A TrackRow isn't an Object2D so we manually layout track elements with the track row's y and height
     */
    protected layoutY() {
        // handle
        let handle = this.resizeHandle;
        handle.originY = -0.5;
        handle.y = this.y + this.h;

        // header
        this.header.y = this.y + this.spacing.y * 0.5;
        this.header.h = this.h - this.spacing.y;

        this.closeButton.y = this.y + this.spacing.y * 0.5;
        this.closeButton.h = this.h - this.spacing.y;

        // tiles
        for (let trackView of this.trackViews) {
            trackView.y = this.y + this.spacing.y * 0.5;
            trackView.h = this.h - this.spacing.y;
        }

        // update header if expand / collapse-toggle is out of sync with height
        if (this._headerIsExpandedState !== this.isExpanded()) {
            this.updateHeader();
        }
    }

    protected updateHeader() {
        this._headerIsExpandedState = this.isExpanded();
        this.header.content = (<TrackViewer.TrackHeader
            reorder={this.reorder}
            model={this.model}
            expandable={this.model.expandable != null ? this.model.expandable : this.defaultExpandable}
            isExpanded={this._headerIsExpandedState}
            setExpanded={(toggle: boolean) => {
                if (this.interactionDisabled) return;

                this.setHeight(toggle ? this.expandedTrackHeightPx : this.defaultHeightPx);
            }}
            moveUp={() => this.onMoveUp(this)}
            moveDown={() => this.onMoveDown(this)}
            style={{
                opacity: this._opacity,
                pointerEvents: this.interactionDisabled ? 'none' : null
            }}
        />);
        this.closeButton.content = (<TrackViewer.TrackCloseButton
            track={this}
            onClick={() => {
                if (this.interactionDisabled) return;

                this.onClose(this);
            }}
            style={{
                opacity: this._opacity,
                pointerEvents: this.interactionDisabled ? 'none' : null
            }}
            />
        );
    }

    protected isExpanded = () => {
        return this.getHeight() >= this.expandedTrackHeightPx;
    }

}

export default TrackViewer;
