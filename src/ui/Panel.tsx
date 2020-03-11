import IconButton from "@material-ui/core/IconButton";
import CancelIcon from "@material-ui/icons/Cancel";
import CheckIcon from "@material-ui/icons/Check";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import CloseIcon from "@material-ui/icons/Close";
import EditIcon from "@material-ui/icons/Edit";
import Animator from "../Animator";
import { InteractionEvent, WheelDeltaMode, WheelInteractionEvent, InteractionEventInternal } from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import * as React from "react";
import { InternalDataSource } from "../data-source/InternalDataSource";
import { Contig } from "../model";
import TrackObject, { AxisPointerStyle } from "../track/TrackObject";
import ReactObject from "./core/ReactObject";
import Axis from "./Axis";
import { StyleProxy } from "./util";

enum DragMode {
    Move,
    SelectRegion,
}

export interface PanelInternal {
    setSecondaryAxisPointers(secondaryAxisPointers: { [pointerId: string]: number }): void,
}

export class Panel extends Object2D {

    column: number; // @! deprecated

    maxRange: number = 1e10;
    minRange: number = 10;
    clampToTracks: boolean = false;

    readonly header: ReactObject;
    readonly xAxis: Axis;
    readonly resizeHandle: Rect;
    readonly trackViews = new Set<TrackObject>();

    get closable(): boolean { return this._closable; }
    get closing(): boolean { return this._closing; }

    set closable(v: boolean) {
        this._closable = v;
        this.updatePanelHeader();
    }
    set closing(v: boolean) {
        this._closing = v;
        this.updatePanelHeader();
    }

    protected _closable = false;
    protected _closing = false;

    protected dataSource: InternalDataSource;

    // view-state is defined by genomic location
    // viewport is designed to weight high precision to relatively small values (~millions) and lose precision for high values (~billions+)
    // these should only be changed by setContig() and setRange()
    readonly contig: string;
    readonly x0: number = 0;
    readonly x1: number = 1;

    protected activeAxisPointers: { [ pointerId: string ]: number } = {};
    protected secondaryAxisPointers: { [pointerId: string]: number } = {};

    protected tileDragging = false;
    protected tileHovering = false;

    protected isEditing: boolean = false;

    protected availableContigs: ReadonlyArray<Contig>;

    constructor(
        protected onClose: (t: Panel) => void,
        protected readonly spacing: { x: number, y: number },
        protected readonly panelHeaderHeight: number,
        protected readonly xAxisHeight: number,
        dataSource: InternalDataSource,
    ) {
        super();
        
        // a panel has nothing to render on its own
        this.render = false;

        this.header = new ReactObject();
        this.fillX(this.header);
        this.header.h = this.panelHeaderHeight;
        this.header.containerStyle = {
            zIndex: 3,
            backgroundColor: '#fff',
        }
        this.header.originY = -1;
        this.header.y = -this.xAxisHeight - this.spacing.y * 0.5;
        this.add(this.header);

        // 1/2 spacing around the x-axis
        let offset = 0.5; // offset labels by 0.5 to center on basepairs
        this.xAxis = new Axis({
            x0: this.x0,
            x1: this.x1,
            align: 'bottom',
            offset: offset,
            snap: 1,
            startFrom: 1,
            tickSpacingPx: 80,
            clip: true,
            color: [0, 0, 0],
            fontSizePx: 11,
            tickOffsetPx: 2,
            tickSizePx: 2,
        });
        this.xAxis.minDisplay = 0;
        this.xAxis.maxDisplay = Infinity;
        this.xAxis.y = -2;
        this.xAxis.h = this.xAxisHeight;
        this.xAxis.originY = -1;
        this.xAxis.z = 20;
        this.fillX(this.xAxis);
        this.add(this.xAxis);

        // add solid a white background to XAxis so that content is hidden underneath
        let xAxisBg = new Rect(0, this.xAxisHeight, [1, 1, 1, 1]);
        xAxisBg.z = 10;
        xAxisBg.originY = -1;
        xAxisBg.y = -this.spacing.y;
        this.fillX(xAxisBg);
        this.add(xAxisBg);

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.originX = -0.5;
        this.resizeHandle.relativeX = 1;
        this.resizeHandle.relativeH = 1;
        this.resizeHandle.w = this.spacing.x;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);

        this.setDataSource(dataSource);
    }

    applyStyle(styleProxy: StyleProxy) {
        this.xAxis.color = styleProxy.getColor('color') || this.xAxis.color;
        this.xAxis.fontSizePx = styleProxy.getNumber('font-size') || this.xAxis.fontSizePx;
    }

    setResizable(v: boolean) {
        // handle should only be in the scene-graph if it's resizable
        this.remove(this.resizeHandle);
        if (v) this.add(this.resizeHandle);
        this.resizeHandle.cursorStyle = v ? 'col-resize' : null;
        this.resizeHandle.color = v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1];
    }

    addTrackView(trackView: TrackObject) {
        trackView.addInteractionListener('dragstart', this.onTrackDragStart);
        trackView.addInteractionListener('dragmove', this.onTrackDragMove);
        trackView.addInteractionListener('dragend', this.onTrackDragEnd);
        trackView.addInteractionListener('pointerup', this.onTrackDragEnd);
        trackView.addInteractionListener('wheel', this.onTrackWheel);
        trackView.addInteractionListener('pointermove', this.onTrackPointerMove);
        trackView.addInteractionListener('pointerleave', this.onTrackLeave);
        trackView.setDataSource(this.dataSource);
        trackView.setContig(this.contig);
        trackView.setRange(this.x0, this.x1);

        this.fillX(trackView);
        this.add(trackView);

        this.trackViews.add(trackView);
    }

    removeTrackView(trackView: TrackObject) {
        trackView.removeInteractionListener('dragstart', this.onTrackDragStart);
        trackView.removeInteractionListener('dragmove', this.onTrackDragMove);
        trackView.removeInteractionListener('dragend', this.onTrackDragEnd);
        trackView.removeInteractionListener('pointerup', this.onTrackDragEnd);
        trackView.removeInteractionListener('wheel', this.onTrackWheel);
        trackView.removeInteractionListener('pointermove', this.onTrackPointerMove);
        trackView.removeInteractionListener('pointerleave', this.onTrackLeave);

        this.remove(trackView);

        this.trackViews.delete(trackView);
    }

    private _dataSourceId = 0;
    setDataSource(dataSource: InternalDataSource) {
        this.dataSource = dataSource;
        this._dataSourceId++;

        for (let trackView of this.trackViews) {
            trackView.setDataSource(dataSource);
        }

        this.setAvailableContigs([]);

        let currentDataSourceId = this._dataSourceId;
        this.dataSource.getContigs().then((contigs) => {
            if (this._dataSourceId !== currentDataSourceId) return;
            this.setAvailableContigs(contigs);
        });
    }

    setContig(contig: string) {
        (this.contig as any) = contig; // override readonly

        for (let track of this.trackViews) {
            track.setContig(contig);
        }

        this.updatePanelHeader();
    }

    setRange(x0: number, x1: number, animate: boolean = false) {
        // if range is not a finite number then default to current values
        x0 = isFinite(x0) ? x0 : this.x0;
        x1 = isFinite(x1) ? x1 : this.x1;

        x0 = Math.min(x0, x1);
        x1 = Math.max(x0, x1);


        // if range is below allowed minimum, override without changing center
        let span = x1 - x0;
        if (span < this.minRange) {
            let midIndex = (x0 + x1) * 0.5;
            x0 = midIndex - this.minRange * 0.5;
            x1 = midIndex + this.minRange * 0.5;
            span = this.minRange;
        }

        if (animate) {
            let t = 10000;
            let criticalFriction = (Math.sqrt(t) * 2);
            let f = criticalFriction * 3;
            Animator.springTo(
                this._rangeAnimationObject,
                { x0: x0, x1: x1 },
                {tension: t, friction: f}, 
            );
        } else {
            Animator.stop(this._rangeAnimationObject);
            this._rangeAnimationObject.x0 = x0;
            this._rangeAnimationObject.x1 = x1;
        }
    }

    protected setAvailableContigs(contigs: Array<Contig>) {
        this.availableContigs = contigs;
        this.updatePanelHeader();
    }

    protected getFormattedContig(contigId: string) {
        // determine a human-friendly name for the contig
        let availableContig = this.availableContigs.find(c => c.id === contigId);
        if (availableContig != null) {
            if (availableContig.name != null) {
                // use user-supplied name
                return availableContig.name;
            } else {
                return contigId;
            }
        } else {
            // unknown contig
            return `${this.contig}`;
        }
    }

    protected setSecondaryAxisPointers(secondaryAxisPointers: { [ pointerId: string ]: number }) {
        // remove any old and unused axis pointers
        for (let pointerId in this.secondaryAxisPointers) {
            if (secondaryAxisPointers[pointerId] === undefined && this.activeAxisPointers[pointerId] === undefined) {
                for (let trackView of this.trackViews) {
                    trackView.removeAxisPointer(pointerId);
                }
            }
        }

        // add or update secondary axis pointers
        for (let pointerId in secondaryAxisPointers) {
            // if this panel has this pointer as an active axis pointer, skip it
            if (this.activeAxisPointers[pointerId] !== undefined) {
                continue;
            }

            let absX = secondaryAxisPointers[pointerId];

            let span = this.x1 - this.x0;
            let fractionX = (absX - this.x0) / span;

            this.secondaryAxisPointers[pointerId] = absX;

            for (let trackView of this.trackViews) {
                trackView.setAxisPointer(pointerId, fractionX, AxisPointerStyle.Secondary);
            }
        }
    }

    private _rangeAnimationObject = {
        _setRangeInternal: (x0: number, x1: number) => { this.setRangeImmediate(x0, x1) },
        _x0: this.x0,
        _x1: this.x1,

        set x0(x: number) {
            this._x0 = x;
            this._setRangeInternal(this._x0, this._x1);
        },
        set x1(x: number) {
            this._x1 = x;
            this._setRangeInternal(this._x0, this._x1);
        },
        get x0() { return this._x0; },
        get x1() { return this._x1; },
    }

    private setRangeImmediate(x0: number, x1: number) {
        let l = this.applyLimits(x0, x1);
        x0 = l.x0;
        x1 = l.x1;

        (this.x0 as any) = x0;
        (this.x1 as any) = x1;

        // control axis text length by number of visible base pairs
        // when viewing a small number of bases the exact span is likely required
        let span = x1 - x0;
        if (span < 150) {
            this.xAxis.maxTextLength = Infinity;
        } else if (span < 1e5) {
            this.xAxis.maxTextLength = 6;
        } else {
            this.xAxis.maxTextLength = 4;
        }

        this.xAxis.setRange(x0, x1);

        for (let track of this.trackViews) {
            track.setRange(x0, x1);
        }

        this.updatePanelHeader();
    }

    protected applyLimits(x0: number, x1: number) {
        if (this.clampToTracks) {
            x0 = Math.max(0, x0);
            x1 = Math.max(0, x1);

            let allMaxX = -Infinity;
            for (let trackView of this.trackViews) {
                let maxX = trackView.getTileLoader() .maximumX;
                if (isFinite(maxX)) {
                    allMaxX = Math.max(maxX, allMaxX);
                }
            }

            if (allMaxX > 0) {
                x0 = Math.min(allMaxX, x0);
                x1 = Math.min(allMaxX, x1);
            }
        }
        return { x0, x1 };
    }

    protected onTrackLeave = (e: InteractionEvent) => {
        this.tileHovering = false;
        if (!this.tileDragging) {
            this.removeActiveAxisPointer(e);
        }
    }

    protected onTrackPointerMove = (e: InteractionEvent) => {
        this.tileHovering = true;
        this._dragMode = undefined;
        this.setActiveAxisPointer(e);
    }

    protected onTrackWheel = (e: WheelInteractionEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let xScrollDomPx = 0;
        let yScrollDomPx = 0;

        // determine panning delta in dom pixels from horizontal scroll amount
        switch (e.wheelDeltaMode) {
            default:
            case WheelDeltaMode.Pixel: {
                xScrollDomPx = e.wheelDeltaX;
                yScrollDomPx = e.wheelDeltaY;
                break;
            }
            case WheelDeltaMode.Line: {
                // assume a line is roughly 12px (needs experimentation)
                xScrollDomPx = e.wheelDeltaX * 12;
                yScrollDomPx = e.wheelDeltaY * 12;
                break;
            }
            case WheelDeltaMode.Page: {
                // assume a page is roughly 1000px (needs experimentation)
                xScrollDomPx = e.wheelDeltaX * 1000;
                yScrollDomPx = e.wheelDeltaY * 1000;
                break;
            }
        }

        // gesture disambiguation; when dominantly zooming we want to reduce panning speed
        // normalize scroll vector
        let scrollVectorLengthSq = xScrollDomPx * xScrollDomPx + yScrollDomPx * yScrollDomPx;
        // avoid divide by 0 normalization issues
        if (scrollVectorLengthSq <= 0) {
            scrollVectorLengthSq = 1;
        }
        let scrollVectorLength = Math.sqrt(scrollVectorLengthSq);
        let normScrollX = xScrollDomPx / scrollVectorLength; // cosAngleY
        let normScrollY = yScrollDomPx / scrollVectorLength; // cosAngleX
        // as normScrollVectorY approaches 1, we should scale xScrollDomPx to
        let absAngleY = Math.acos(Math.abs(normScrollY));
        let fractionalAngleY = 2 * absAngleY / (Math.PI); // 0 = points along y, 1 = points along x
        let absAngleX = Math.acos(Math.abs(normScrollX));
        let fractionalAngleX = 2 * absAngleX / (Math.PI); // 0 = points along x, 1 = points along y
        
        // use fraction angle to reduce x as angle approaches y-pointing
        // see https://www.desmos.com/calculator/butkwn0xdt for function exploration
        let edge = 0.75;
        let xReductionFactor = Math.sin(
            Math.pow(Math.min(fractionalAngleY / edge, 1), 3) * (Math.PI / 2)
        );
        let yReductionFactor = Math.sin(
            Math.pow(Math.min(fractionalAngleX / edge, 1), 3) * (Math.PI / 2)
        );

        xScrollDomPx = xScrollDomPx * xReductionFactor;
        yScrollDomPx = yScrollDomPx * yReductionFactor;

        // compute zoom multiplier from wheel y
        let zoomFactor = 1;
        if (e.ctrlKey) {
            // pinch zoom
            zoomFactor = 1 + e.wheelDeltaY * 0.01; // I'm assuming mac trackpad outputs change in %, @! needs research
        } else {
            // scroll zoom
            let scrollZoomSpeed = 0.3;
            zoomFactor = 1 + yScrollDomPx * 0.01 * scrollZoomSpeed;
        }

        let x0 = this.x0;
        let x1 = this.x1;
        let span = x1 - x0;
        
        // apply scale change
        let zoomCenterF = e.fractionX;

        // clamp zoomFactor to range limits
        if (span * zoomFactor > this.maxRange) {
            zoomFactor = this.maxRange / span;
        }
        if (span * zoomFactor < this.minRange) {
            zoomFactor = this.minRange / span;
        }

        let d0 = span * zoomCenterF;
        let d1 = span * (1 - zoomCenterF);
        let p = d0 + x0;

        x0 = p - d0 * zoomFactor;
        x1 = p + d1 * zoomFactor;

        let newSpan = x1 - x0;
        let midSpan = (newSpan + span) * 0.5;

        // offset by x-scroll
        let basePairsPerPixel = midSpan / this.getComputedWidth();
        let xScrollBasePairs = basePairsPerPixel * xScrollDomPx;
        x0 = x0 + xScrollBasePairs;
        x1 = x1 + xScrollBasePairs;

        this.setRange(x0, x1);
    }

    // drag state
    protected _dragMode: DragMode | undefined;
    protected _dragXF0: number;
    protected _dragX00: number;
  
    // track total drag distance to hint whether or not we should cancel some interactions
    protected _lastDragLX: number;
    protected _dragDistLocal: number;

    protected onTrackDragStart = (e: InteractionEvent) => {
        this._dragMode = undefined;

        if (e.buttonState !== 1) return;

        // determine drag mode
        if (e.shiftKey) {
            this._dragMode = DragMode.SelectRegion;
        } else {
            // default drag
            this._dragMode = DragMode.Move;
        }

        // common
        this._dragXF0 = e.fractionX;
        this._dragX00 = this.x0;

        this._lastDragLX = e.localX;
        this._dragDistLocal = 0;

        switch (this._dragMode) {
            case DragMode.SelectRegion: {
                e.preventDefault();
                for (let track of this.trackViews) {
                    track.setFocusRegion(this._dragXF0, this._dragXF0);
                }
                break;
            }
            case DragMode.Move: {
                e.preventDefault();

                this.tileDragging = true;
                break;
            }
        }
    }

    protected onTrackDragMove = (e: InteractionEvent) => {
        if (e.buttonState !== 1) return;

        this._dragDistLocal += Math.abs(e.localX - this._lastDragLX);
        this._lastDragLX = e.localX;

        switch (this._dragMode) {
            case DragMode.SelectRegion: {
                e.preventDefault();
                // selected region in fractional units
                let selectedRegionF0 = this._dragXF0;
                let selectedRegionF1 = e.fractionX;
                for (let track of this.trackViews) {
                    track.setFocusRegion(selectedRegionF0, selectedRegionF1);
                }
                break;
            }
            case DragMode.Move: {
                e.preventDefault();

                this.tileDragging = true;

                let span = this.x1 - this.x0;

                let dxf = e.fractionX - this._dragXF0;
                let x0 = this._dragX00 + span * (-dxf);
                let x1 = x0 + span;

                let l = this.applyLimits(x0, x1);
                let dlx0 = Math.abs(l.x0 - x0);
                let dlx1 = Math.abs(l.x1 - x1);

                if (dlx0 > 0) {
                    x0 = l.x0;
                    x1 = x0 + span;
                }
                if (dlx1 > 0) {
                    x1 = l.x1;
                    x0 = x1 - span;
                }

                this.setRange(x0, x1);
                break;
            }
        }

        // update axis pointer position because we probably prevented default
        this.setActiveAxisPointer(e);
    }

    protected onTrackDragEnd = (e: InteractionEvent) => {
        e.stopPropagation();

        switch (this._dragMode) {
            case DragMode.SelectRegion: {
                e.preventDefault();

                // determine selected region in absolute units (base pairs)
                let span = this.x1 - this.x0;
            
                let selectedRegionX0 = this.x0 + span * this._dragXF0;
                let selectedRegionX1 = this.x0 + span * e.fractionX;

                let x0 = Math.min(selectedRegionX0, selectedRegionX1);
                let x1 = Math.max(selectedRegionX0, selectedRegionX1);
                
                // clamp to existing range (so it must be a zoom in)
                x0 = Math.max(x0, this.x0);
                x1 = Math.min(x1, this.x1);

                let event = new SelectRegionEvent(
                    this,
                    x0,
                    x1,
                    Math.min(this._dragXF0, e.fractionX),
                    Math.max(this._dragXF0, e.fractionX),
                );

                this.emit('panel-event', event);

                if (!event.defaultPrevented) {
                    // zoom into region
                    this.setRange(x0, x1, true);
                }
                
                break;
            }
            case DragMode.Move: {
                // if total drag distance, preventDefault so that pointerup isn't fired for other nodes
                if (this._dragDistLocal > 4) {
                    e.preventDefault();
                }
                break;
            }
        }

        for (let track of this.trackViews) {
            track.clearFocusRegion();
        }

        this.tileDragging = false;

        if (!this.tileHovering) {
            this.removeActiveAxisPointer(e);
        }

        this._dragMode = undefined;
    }

    protected setActiveAxisPointer(e: InteractionEvent) {
        let fractionX = e.fractionX;
        let span = this.x1 - this.x0;
        let axisPointerX = span * fractionX + this.x0;

        this.activeAxisPointers[e.pointerId] = axisPointerX;

        for (let tile of this.trackViews) {
            tile.setAxisPointer(e.pointerId.toString(), fractionX, AxisPointerStyle.Active);
        }

        // broadcast active axis pointer change
        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected removeActiveAxisPointer(e: InteractionEvent) {
        if (this.activeAxisPointers[e.pointerId] === undefined) {
            return;
        }

        delete this.activeAxisPointers[e.pointerId];

        for (let trackView of this.trackViews) {
            trackView.removeAxisPointer(e.pointerId.toString());
        }

        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected fillX(obj: Object2D) {
        obj.x = this.spacing.x * 0.5;
        obj.originX = 0;
        obj.relativeX = 0;
        obj.relativeW = 1;
        obj.w = -this.spacing.x;
    }

    protected availableContigAtOffset = (contig: string, offset: number): string => {
        if (this.availableContigs != null) {
            const idx = this.availableContigs.findIndex(c => c.id === contig);
            if (idx < 0) return this.availableContigs[0].id;
            let newIdx = (idx + offset) % this.availableContigs.length;
            if (newIdx < 0) newIdx += this.availableContigs.length;
            return this.availableContigs[newIdx].id;
        } else {
            return this.contig;
        }
    }

    protected updatePanelHeader() {
        let rangeString = `${Axis.formatValue(this.x0, 8)}bp to ${Axis.formatValue(this.x1, 8)}bp`;
        const startBp = Math.floor(this.x0).toFixed(0);
        const endBp = Math.ceil(this.x1).toFixed(0);
        let rangeSpecifier = `${this.contig}:${startBp}-${endBp}`;

        this.header.content = <PanelHeader 
            panel={ this }
            contig={ this.getFormattedContig(this.contig) }
            rangeString={ rangeString }
            rangeSpecifier={ rangeSpecifier }
            enableClose = { this._closable && !this.closing } 
            enableContigNavigation={this.availableContigs != null && (this.availableContigs.length > 1) }
            onClose = { this.onClose } 
            isEditing = { this.isEditing }
            onEditCancel = { () => this.finishEditing() }
            onEditSave = { (rangeSpecifier: string) => this.finishEditing(rangeSpecifier) }
            onEditStart = { () => this.startEditing() }
            onNextContig = { () => {
                let contig = this.availableContigAtOffset(this.contig, 1);
                this.setContig(contig);
                const idx = this.availableContigs.findIndex(c => c.id === contig);
                if (idx !== -1) {
                    this.setRange(this.availableContigs[idx].startIndex, this.availableContigs[idx].span);
                }
            }}
            onPreviousContig={() => {
                let contig = this.availableContigAtOffset(this.contig, -1);
                this.setContig(contig);
                const idx = this.availableContigs.findIndex(c => c.id === contig);
                if (idx !== -1) {
                    this.setRange(this.availableContigs[idx].startIndex, this.availableContigs[idx].span);
                }
            }}
        />;
    }

    protected finishEditing(rangeSpecifier?: string) {
        this.isEditing = false;
        if (rangeSpecifier) {
            this.setRangeUsingRangeSpecifier(rangeSpecifier);
        }
        this.updatePanelHeader();
    }

    protected startEditing() {
        this.isEditing = true;
        this.updatePanelHeader();
    }

    protected setRangeUsingRangeSpecifier(specifier: string) {
        // @! this could be improved to be more robust (for example, omitting contig should use current contig, etc)
        try {
            let parts = specifier.split(':');
            let contig = parts[0];

            // make chrx to chrX
            let chromosomeContigMatch = /chr(.*)$/.exec(contig);
            if (chromosomeContigMatch) {
                contig = 'chr' + chromosomeContigMatch[1].toUpperCase();
            }

            const ranges = parts[1].split('-');
            this.setContig(contig);
            this.setRange(parseFloat(ranges[0].replace(/,/g, '')), parseFloat(ranges[1].replace(/,/g, '')));
        } catch (e) {
            console.error(`Could not parse specifier "${specifier}"`);
        }
    }

}

export class PanelEvent<Type extends string> {

    get defaultPrevented () {
        return this._defaultPrevented;
    }

    constructor(
        readonly type: Type,
        readonly panel: Panel
    ) { }

    preventDefault = () => {
        this._defaultPrevented = true;
    }
    
    protected _defaultPrevented = false
}

export class SelectRegionEvent extends PanelEvent<'select-region'> {

    constructor(
        panel: Panel,
        // base-pair range
        /**
         * Selection start in base-pairs
         */
        readonly x0: number,
        /**
         * Selection end in base-pairs
         */
        readonly x1: number,
        /**
         * Location of selection start relative to the panel view, where 0 left most edge and 1 is rightmost
         */
        readonly x0ViewFraction: number, 
        /**
         * Location of selection end relative to the panel view, where 0 left most edge and 1 is rightmost
         */
        readonly x1ViewFraction: number, 
    ) {
        super('select-region', panel);
    }

}

interface PanelProps {
    panel: Panel,
    contig: string,
    rangeString: string,
    rangeSpecifier: string,
    enableClose: boolean,
    enableContigNavigation: boolean,
    isEditing: boolean,
    onEditStart: () => void,
    onEditSave: (rangeSpecifier: string) => void,
    onEditCancel: () => void,
    onClose: (panel: Panel) => void,
    onNextContig: (panel: Panel) => void,
    onPreviousContig: (panel: Panel) => void
}

class PanelHeader extends React.Component<PanelProps,{}> {

    render() {
        let headerContents = null;
        
        const headerContainerStyle : React.CSSProperties= {
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
        };

        const headerStyle : React.CSSProperties = {
            marginTop: 8, 
            marginLeft: 8
        }

        const iconViewBoxSize = '0 0 32 32';
        
        const closeIcon = this.props.enableClose ? (
            <div style={{
                position: 'absolute',
                right: 0
            }}>
                <IconButton onClick={() => this.props.onClose(this.props.panel)} color="inherit">
                    <CloseIcon />
                </IconButton>
            </div>
        ) : null;

        const previousIcon =(
            <div style={{
                position: 'absolute',
                left: 0
            }}>
                <IconButton onClick={() => this.props.onPreviousContig(this.props.panel)} color="inherit">
                    <ChevronLeftIcon />
                </IconButton>
            </div>
        );

        const nextIcon = (
            <div style={{
                position: 'absolute',
                right: 0
            }}>
                <IconButton onClick={() => this.props.onNextContig(this.props.panel)} color="inherit">
                    <ChevronRightIcon />
                </IconButton>
            </div>
        );

        if (this.props.isEditing) {
            let userRangeSpecifier = this.props.rangeSpecifier;
            headerContents = (<div style={headerContainerStyle} >
                <input
                    autoFocus
                    onChange={(e) => userRangeSpecifier = e.target.value}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            this.props.onEditSave(userRangeSpecifier);
                        }
                    }}
                    type="text"
                    defaultValue={this.props.rangeSpecifier}
                    style={{
                        maxWidth: '200px',
                        width: '100%',
                    }}
                />
                <span style={headerStyle}>
                    <CancelIcon
                        onClick={() => this.props.onEditCancel()} 
                        viewBox={iconViewBoxSize}
                    />
                </span>
                <span style={headerStyle}>
                    <CheckIcon 
                        onClick={() => this.props.onEditSave(userRangeSpecifier)} 
                        viewBox={iconViewBoxSize}
                    />
                </span>
                {closeIcon}
            </div>);
        } else {
            headerContents = (<div style={headerContainerStyle}>
                {this.props.enableContigNavigation ? previousIcon : null}
                <span onClick={() => this.props.onEditStart()}><b>{this.props.contig}</b> {this.props.rangeString}</span>
                <span style={headerStyle} onClick={() => this.props.onEditStart()}>
                    <EditIcon 
                        viewBox={iconViewBoxSize}
                    />
                </span>
                {this.props.enableContigNavigation ? nextIcon : null}
            </div>);
        }

        return <div
            className="hpgv_ui-block hpgv_panel-header"
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
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
                whiteSpace: 'nowrap',
                cursor: 'pointer',
            }}>
                {headerContents}
            </div>
        </div>
    }
}

export default Panel;