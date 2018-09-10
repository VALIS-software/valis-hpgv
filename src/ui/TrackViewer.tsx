/*

Dev notes:

    Refactor plans:
        - Improve how tracks and panels are laid out; should not need to manually call layout after each change
        - Panels should be an array not a set
*/

import React = require("react");
import IconButton from "material-ui/IconButton";
import SvgAdd from "material-ui/svg-icons/content/add";
import SvgClose from "material-ui/svg-icons/navigation/close";
import SvgExpandLess from "material-ui/svg-icons/navigation/expand-less";
import SvgExpandMore from "material-ui/svg-icons/navigation/expand-more";
import { SiriusApi } from "sirius/SiriusApi";
import Animator from "engine/animation/Animator";
import { GenomicLocation } from "../model/GenomicLocation";
import TrackModel from "../model/TrackModel";
import Object2D from "engine/ui/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "engine/ui/Rect";
import Panel, { PanelInternal } from "./Panel";
import ConstructTrack from "./track/ConstructTrack";
import TrackObject from "./track/BaseTrack";
import { DEFAULT_SPRING } from "./UIConstants";

export interface PanelConfiguration {
    location: GenomicLocation,
    width?: number
}

export interface TrackConfiguration {
    model: TrackModel,
    heightPx?: number
}

export interface TrackViewerConfiguration {
    panels: Array<PanelConfiguration>,
    tracks: Array<TrackConfiguration>,
}

export default class TrackViewer extends Object2D {

    // layout settings
    readonly trackHeaderWidth: number = 180;
    readonly panelHeaderHeight: number = 50;

    readonly spacing = {
        x: 5,
        y: 5
    };
    readonly xAxisHeight = 40; // height excluding spacing
    readonly minPanelWidth = 35;
    readonly minTrackHeight = 35;

    protected panels = new Set<Panel>();
    protected tracks = new Array<Track>();

    protected panelEdges = new Array<number>();
    protected rowOffsetY: number = 0;

    /** used to collectively position panels and track tiles */
    protected grid: Object2D;
    protected addPanelButton: ReactObject;

    constructor() {
        super();
        this.render = false;

        // fill parent dimensions
        this.layoutW = 1;
        this.layoutH = 1;

        this.grid = new Rect(0, 0, [0.9, 0.9, 0.9, 1]); // grid is Rect type for debug display
        this.grid.render = false;
        this.add(this.grid);

        this.initializeDragPanning();
        this.initializeGridResizing();

        this.addPanelButton = new ReactObject(
            <AddPanelButton onClick={() => {
                this.addPanel({ contig: 'chr1', x0: 0, x1: 249e6}, true);
            }} />,
            this.panelHeaderHeight,
            this.panelHeaderHeight,
        );
        this.addPanelButton.x =  this.spacing.x * 0.5;
        this.addPanelButton.containerStyle = {
            zIndex: 3,
        }
        this.addPanelButton.layoutParentX = 1;
        this.addPanelButton.layoutY = -1;
        this.addPanelButton.y = -this.xAxisHeight - this.spacing.x * 0.5;
        this.grid.add(this.addPanelButton);

        const leftTrackMask = new ReactObject(<div 
            style={
                {
                    backgroundColor: '#fff',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                }
            }
        />, this.trackHeaderWidth  + this.spacing.x, this.panelHeaderHeight + this.xAxisHeight - 0.5 * this.spacing.y);
        this.add(leftTrackMask);

        const rightTrackMask = new ReactObject(<div 
            style={
                {
                    backgroundColor: '#fff',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                }
            }
        />, this.panelHeaderHeight + 1.5 * this.spacing.x, this.panelHeaderHeight + this.xAxisHeight - 0.5 * this.spacing.y);
        rightTrackMask.layoutParentX = 1;
        rightTrackMask.x = -this.panelHeaderHeight - 1.5 * this.spacing.x;
        this.add(rightTrackMask);

        this.layoutGridContainer();

        window.addEventListener('resize', this.onResize);
    }

    // track-viewer state deltas
    addTrack(model: TrackModel, heightPx: number = 50, animate: boolean = true): Track {
        // create a track and add the header element to the grid
        let track: Track = new Track(
            model,
            heightPx,
            () => {
                this.layoutTrackRows(true);
            }
        );

        let rowObject = new RowObject(
            model.name,
            this.spacing,
            () => this.closeTrack(track),
            (h: number) => track.heightPx = h,
            (): number => track.heightPx
        );

        (track as any as TrackInternal).rowObject = rowObject;

        // add track tile to all panels
        for (let panel of this.panels) {
            var trackView = ConstructTrack(model);
            panel.addTrackView(trackView);
            rowObject.addTrackView(trackView);
        }

        this.tracks.push(track);

        rowObject.closeButton.layoutParentX = 1;
        rowObject.closeButton.x = -this.spacing.x;
        rowObject.closeButton.w = 50;
        rowObject.header.x = -this.trackHeaderWidth + this.spacing.x * 0.5;
        rowObject.header.w = this.trackHeaderWidth;

        rowObject.resizeHandle.layoutW = 1;
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
        this.grid.add(rowObject.closeButton);
        this.grid.add(rowObject.resizeHandle);

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

        trackInternal.closing = true;

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

    addPanel(location: GenomicLocation, animate: boolean = true) {
        let edges = this.panelEdges;
        let newColumnIndex = Math.max(edges.length - 1, 0);

        // add a new column edge, overflow the grid so the panel extends off the screen
        if (edges.length === 0) edges.push(0);
        let newWidth = newColumnIndex == 0 ? 1 : 1 / newColumnIndex;
        let newEdge = 1 + newWidth;
        edges.push(newEdge);

        // create panel object and add header to the scene graph
        let panel = new Panel((p) => this.closePanel(p, true), this.spacing, this.panelHeaderHeight, this.xAxisHeight);
        panel.setContig(location.contig);
        panel.setRange(location.x0, location.x1);
        panel.column = newColumnIndex; // @! should use array of panels instead of column field
        panel.layoutH = 1; // fill the full grid height
        this.grid.add(panel);

        // set available contigs to navigate to from the API
        SiriusApi.getContigsSorted().then((contigs) => panel.setAvailableContigs(contigs));

        // initialize tracks for this panel
       for (let track of this.tracks) {
           let trackView = ConstructTrack(track.model);
           panel.addTrackView(trackView);
           (track as any as TrackInternal).rowObject.addTrackView(trackView);
       }

        this.panels.add(panel);

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
            Animator.addAnimationCompleteCallback(panel, 'layoutW', () => {
                this.deletePanel(panel);
                onComplete();
            }, true);
            Animator.springTo(panel, { layoutW: 0 }, DEFAULT_SPRING);
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

    getConfiguration(): TrackViewerConfiguration {
        let panels: TrackViewerConfiguration['panels'] = new Array();
        for (let panel of this.panels) {
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
                model: track.model,
                heightPx: track.heightPx,
            });
        }

        return {
            panels: panels,
            tracks: tracks,
        }
    }

    setConfiguration(state: TrackViewerConfiguration) {
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
        for (let i = 0; i < state.panels.length; i++) {
            let panelState = state.panels[i];
            this.addPanel(panelState.location, false);
        }

        // determine what width to set panels that have no width specified
        let unassignedWidthRemaining = 1;
        let unassignedWidthCount = 0;
        for (let i = 0; i < state.panels.length; i++) {
            let panelState = state.panels[i];
            if (panelState.width != null) {
                unassignedWidthRemaining -= panelState.width;
            } else {
                unassignedWidthCount++;
            }
        }
        let unassignedWidthPanel = unassignedWidthRemaining / unassignedWidthCount;

        // set panel edges from state widths
        let e = 0;
        for (let i = 0; i < state.panels.length; i++) {
            let panelState = state.panels[i];
            this.panelEdges[i] = e;

            if (panelState.width != null) {
                e += panelState.width;
            } else {
                e += unassignedWidthPanel;
            }
        }

        this.layoutPanels(false);

        // create rows
        for (let track of state.tracks) {
            this.addTrack(track.model, track.heightPx, false);
        }

        this.layoutTrackRows(false);
    }

    getTracks() {
        return this.tracks.slice();
    }

    getPanels() {
        return new Set(this.panels);
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

        // stop any active animations on the panel
        Animator.stop(panel);
        // remove any open cleanupPanel panel callbacks
        Animator.removeAnimationCompleteCallbacks(panel, 'layoutW', this.deletePanel);

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
                let layoutParentX = edges[panel.column];
                let layoutW = panel.closing ? 0 : edges[panel.column + 1] - edges[panel.column];
                if (animate) {
                    Animator.springTo(panel, { layoutParentX: layoutParentX, layoutW: layoutW }, DEFAULT_SPRING);
                } else {
                    Animator.stop(panel, ['layoutParentX', 'layoutW']);
                    panel.layoutParentX = layoutParentX;
                    panel.layoutW = layoutW;
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
                    Animator.springTo(rowObject, { y: y, h: h }, DEFAULT_SPRING);
                } else {
                    Animator.stop(rowObject, ['y', 'h']);
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
            maxX = Math.max(panel.layoutParentX + panel.layoutW, maxX);
        }
        this.addPanelButton.layoutParentX = maxX;
    }

    protected layoutGridContainer() {
        this.grid.x = this.trackHeaderWidth + this.spacing.x * 0.5;
        this.grid.w =
            -this.trackHeaderWidth - this.spacing.x
            - this.addPanelButton.w;
        this.grid.layoutW = 1;
        this.grid.y = this.panelHeaderHeight + this.spacing.y * 0.5 + this.xAxisHeight;

        // (grid height is set dynamically when laying out tracks)
    }

    // limits rowOffsetY to only overflow region
    protected applyOverflowLimits() {
        let maxOffset = 0;

        // determine minOffset from grid overflow
        // assumes grid.h is up to date (requires calling layoutTrackRows(false))
        let trackViewerHeight = this.getComputedHeight();
        let gridViewportHeight = trackViewerHeight - this.grid.y;
        
        // compute total row-height
        let rowHeight = 0;
        for (let row of this.tracks) {
            rowHeight += row.heightPx;
        }

        const padding = this.spacing.y;
        let overflow = rowHeight - gridViewportHeight + padding;
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

        this.grid.addInteractionListener('dragstart', (e) => {
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

        this.grid.addInteractionListener('dragmove', (e) => {
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
            }
        });

        this.grid.addInteractionListener('dragend', (e) => {
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
    }

    protected endResizingTrack(track: Track) {
        for (let entry of this._resizingTracks) {
            if (entry.track === track) {
                this._resizingTracks.delete(entry);
            }
        }

        this.applyOverflowLimits();
        this.layoutTrackRows(false);
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
        this.onHeightChanged();
    }

    get heightPx() {
        return this._heightPx;
    }

    protected rowObject: RowObject;

    constructor(
        readonly model: TrackModel,
        protected _heightPx: number,
        protected onHeightChanged: () => void
    ) {

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

    get title() {
        return this._title;
    }

    set title(v: string) {
        this._title = v;
        this.updateHeader();
    }

    protected _y: number;
    protected _h: number;
    protected _title: string;

    protected _headerIsExpandedState: boolean | undefined = undefined;

    constructor(
        title: string,
        protected readonly spacing: { x: number, y: number },
        protected onClose: (t: RowObject) => void,
        protected readonly setHeight: (h: number) => void,
        protected readonly getHeight: () => number
    ) {
        this._title = title;
        this.header = new ReactObject();
        this.closeButton = new ReactObject();

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.h = this.spacing.y;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);

        this.updateHeader();
    }

    setResizable(v: boolean) {
        this.resizeHandle.cursorStyle = v ? 'row-resize' : null;
        this.resizeHandle.color.set(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }
    
    addTrackView(trackView: TrackObject) {
        this.trackViews.add(trackView);
        this.layoutY();
    }

    removeTrackView(trackView: TrackObject) {
        this.trackViews.delete(trackView);
    }

    /**
     * A TrackRow isn't an Object2D so we manually layout track elements with the track row's y and height
     */
    protected layoutY() {
        // handle
        let handle = this.resizeHandle;
        handle.layoutY = -0.5;
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
        this.header.content = (<TrackHeader
            title={this._title}
            isExpanded={this._headerIsExpandedState}
            setExpanded={(toggle: boolean) => {
                this.setHeight(toggle ? RowObject.expandedTrackHeight : RowObject.collapsedTrackHeight);
            }}
        />);
        this.closeButton.content = (<TrackCloseButton track={this} onClick={() => {
            this.onClose(this);
        }} />);
    }

    protected isExpanded = () => {
        return this.getHeight() >= RowObject.expandedTrackHeight;
    }

    public static readonly expandedTrackHeight = 200;
    public static readonly collapsedTrackHeight = 50;
}

function TrackCloseButton(props: {
    onClick: (track: RowObject) => void,
    track: RowObject,
}) {
    return <div
        style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            color: '#e8e8e8',
            overflow: 'hidden',
            userSelect: 'none',
            backgroundColor: '#171615',
            borderRadius: '0px 8px 8px 0px',
        }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'right',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            <IconButton onClick={() => props.onClick(props.track)}>
                <SvgClose color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
            </IconButton>
        </div>
    </div>
}

function TrackHeader(props: {
    title: string,
    setExpanded?: (state: boolean) => void,
    isExpanded: boolean,
}) {
    const iconColor = 'rgb(171, 171, 171)';
    const iconHoverColor = 'rgb(255, 255, 255)';
    const iconViewBoxSize = '0 0 32 32';
    const style = {
        marginTop: 8,
        marginLeft: 16
    }
    const headerContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
    };

    const ArrowElem = props.isExpanded ? SvgExpandLess : SvgExpandMore;

    const expandArrow = (<ArrowElem
        style={style}
        viewBox={iconViewBoxSize}
        color={iconColor}
        hoverColor={iconHoverColor}
    />);
    return <div
        style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            color: '#e8e8e8',
            backgroundColor: '#171615',
            borderRadius: '8px 0px 0px 8px',
            fontSize: '15px',
            overflow: 'hidden',
            userSelect: 'none',
        }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'center',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            <div onClick={() => {
                props.setExpanded(!props.isExpanded);
            }} style={headerContainerStyle}>
                {expandArrow}
                {props.title}
            </div>
        </div>
    </div>
}

function AddPanelButton(props: {
    onClick: () => void,
}) {
    return <div
    style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        color: '#e8e8e8',
        backgroundColor: '#171615',
        borderRadius: '8px 0px 0px 8px',
    }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'right',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            <IconButton onClick={props.onClick}>
                <SvgAdd color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
            </IconButton>
        </div>
    </div>
}