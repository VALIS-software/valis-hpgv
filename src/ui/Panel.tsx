import IconButton from "material-ui/IconButton";
import SvgEdit from "material-ui/svg-icons/image/edit";
import SvgChevronLeft from "material-ui/svg-icons/navigation/chevron-left";
import SvgChevronRight from "material-ui/svg-icons/navigation/chevron-right";
import SvgCancel from "material-ui/svg-icons/navigation/cancel";
import SvgCheck from "material-ui/svg-icons/navigation/check";
import SvgClose from "material-ui/svg-icons/navigation/close";
import * as React from "react";
import { InteractionEvent, WheelDeltaMode, WheelInteractionEvent } from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "engine/ui/Rect";
import { OpenSansRegular } from "./font/Fonts";
import TrackObject, { AxisPointerStyle } from "./track/BaseTrack";
import XAxis from "./XAxis";
import Animator from "engine/animation/Animator";

enum DragMode {
    Move,
    SelectRegion,
}

export interface PanelInternal {
    setSecondaryAxisPointers(secondaryAxisPointers: { [pointerId: string]: number }): void,
}

export class Panel extends Object2D {

    column: number; // @! todo: refactor to remove this

    maxRange: number = 1e10;
    minRange: number = 10;

    readonly header: ReactObject;
    readonly xAxis: XAxis;
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

    protected formattedContig: string;
    protected isEditing: boolean = false;

    protected availableContigs: Array<string>;

    constructor(
        protected onClose: (t: Panel) => void,
        protected readonly spacing: { x: number, y: number },
        protected readonly panelHeaderHeight: number,
        protected readonly xAxisHeight: number,
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
        this.header.layoutY = -1;
        this.header.y = -this.xAxisHeight - this.spacing.y * 0.5;
        this.add(this.header);

        // 1/2 spacing around the x-axis
        let offset = 0.5; // offset labels by 0.5 to center on basepairs
        this.xAxis = new XAxis(this.x0, this.x1, 11, OpenSansRegular, offset, 1, 1);
        this.xAxis.minDisplay = 0;
        this.xAxis.maxDisplay = Infinity;
        this.xAxis.y = -this.spacing.y;
        this.xAxis.h = this.xAxisHeight;
        this.xAxis.layoutY = -1;
        this.fillX(this.xAxis);
        this.add(this.xAxis);

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.layoutX = -0.5;
        this.resizeHandle.layoutX = -0.5;
        this.resizeHandle.layoutParentX = 1;
        this.resizeHandle.layoutParentX = 1;
        this.resizeHandle.w = this.spacing.x;
        this.resizeHandle.layoutH = 1;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);
    }

    setResizable(v: boolean) {
        // handle should only be in the scene-graph if it's resizable
        this.remove(this.resizeHandle);
        if (v) this.add(this.resizeHandle);
        this.resizeHandle.cursorStyle = v ? 'col-resize' : null;
        this.resizeHandle.color.set(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    addTrackView(trackView: TrackObject) {
        trackView.addInteractionListener('dragstart', this.onTileDragStart);
        trackView.addInteractionListener('dragmove', this.onTileDragMove);
        trackView.addInteractionListener('dragend', this.onTileDragEnd);
        trackView.addInteractionListener('pointerup', this.onTileDragEnd);
        trackView.addInteractionListener('wheel', this.onTileWheel);
        trackView.addInteractionListener('pointermove', this.onTilePointerMove);
        trackView.addInteractionListener('pointerleave', this.onTileLeave);
        trackView.setContig(this.contig);
        trackView.setRange(this.x0, this.x1);

        this.fillX(trackView);
        this.add(trackView);

        this.trackViews.add(trackView);
    }

    removeTrackView(trackView: TrackObject) {
        trackView.removeInteractionListener('dragstart', this.onTileDragStart);
        trackView.removeInteractionListener('dragmove', this.onTileDragMove);
        trackView.removeInteractionListener('dragend', this.onTileDragEnd);
        trackView.removeInteractionListener('pointerup', this.onTileDragEnd);
        trackView.removeInteractionListener('wheel', this.onTileWheel);
        trackView.removeInteractionListener('pointermove', this.onTilePointerMove);
        trackView.removeInteractionListener('pointerleave', this.onTileLeave);

        this.remove(trackView);

        this.trackViews.delete(trackView);
    }

    setContig(contig: string) {
        (this.contig as any) = contig;

        for (let track of this.trackViews) {
            track.setContig(contig);
        }

        // parse contig and create a formatted contig
        let chromosomeContigMatch = /chr(.*)$/.exec(contig);
        if (chromosomeContigMatch) {
            this.formattedContig = `Chromosome ${chromosomeContigMatch[1]}`;
        } else {
            this.formattedContig = `<Invalid contig> ${this.contig}`;
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

    setAvailableContigs(contigs: Array<string>) {
        this.availableContigs = contigs;
        this.updatePanelHeader();
    }

    protected setSecondaryAxisPointers(secondaryAxisPointers: { [ pointerId: string ]: number }) {
        // remove any old and unused axis pointers
        for (let pointerId in this.secondaryAxisPointers) {
            if (secondaryAxisPointers[pointerId] === undefined && this.activeAxisPointers[pointerId] === undefined) {
                for (let tile of this.trackViews) {
                    tile.removeAxisPointer(pointerId);
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

            for (let tile of this.trackViews) {
                tile.setAxisPointer(pointerId, fractionX, AxisPointerStyle.Secondary);
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

    protected onTileLeave = (e: InteractionEvent) => {
        this.tileHovering = false;
        if (!this.tileDragging) {
            this.removeActiveAxisPointer(e);
        }
    }

    protected onTilePointerMove = (e: InteractionEvent) => {
        this.tileHovering = true;
        this._dragMode = undefined;
        this.setActiveAxisPointer(e);
    }

    protected onTileWheel = (e: WheelInteractionEvent) => {
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

    protected onTileDragStart = (e: InteractionEvent) => {
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

    protected onTileDragMove = (e: InteractionEvent) => {
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

                this.setRange(x0, x1);
                break;
            }
        }

        // update axis pointer position because we probably prevented default
        this.setActiveAxisPointer(e);
    }

    protected onTileDragEnd = (e: InteractionEvent) => {
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
                
                // zoom into region
                this.setRange(x0, x1, true);
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
            track.disableFocusRegion();
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

        for (let tile of this.trackViews) {
            tile.removeAxisPointer(e.pointerId.toString());
        }

        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected fillX(obj: Object2D) {
        obj.x = this.spacing.x * 0.5;
        obj.layoutX = 0;
        obj.layoutParentX = 0;
        obj.layoutW = 1;
        obj.w = -this.spacing.x;
    }

    protected availableContigAtOffset = (contig: string, offset: number) => {
        if (this.availableContigs != null) {
            const idx = this.availableContigs.indexOf(contig);
            if (idx < 0) return this.availableContigs[0];
            let newIdx = (idx + offset) % this.availableContigs.length;
            if (newIdx < 0) newIdx += this.availableContigs.length;
            return this.availableContigs[newIdx];
        } else {
            return this.contig;
        }
    }

    protected updatePanelHeader() {
        let rangeString = `${XAxis.formatValue(this.x0, 8)}bp to ${XAxis.formatValue(this.x1, 8)}bp`;
        const startBp = Math.floor(this.x0).toFixed(0);
        const endBp = Math.ceil(this.x1).toFixed(0);
        let rangeSpecifier = `${this.contig}:${startBp}-${endBp}`;

        this.header.content = <PanelHeader 
            panel={ this }
            contig={ this.formattedContig }
            rangeString={ rangeString }
            rangeSpecifier={ rangeSpecifier }
            enableClose = { this._closable && !this.closing } 
            enableContigNavigation = { this.availableContigs != null }
            onClose = { this.onClose } 
            isEditing = { this.isEditing }
            onEditCancel = { () => this.finishEditing() }
            onEditSave = { (rangeSpecifier: string) => this.finishEditing(rangeSpecifier) }
            onEditStart = { () => this.startEditing() }
            onNextContig = { () =>  this.setContig(this.availableContigAtOffset(this.contig, 1)) }
            onPreviousContig={() => this.setContig(this.availableContigAtOffset(this.contig, -1)) }
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
        let parts = specifier.split(':');
        let contig = parts[0];

        // make chrx to chrX
        let chromosomeContigMatch = /chr(.*)$/.exec(contig);
        if (chromosomeContigMatch) {
            contig = 'chr' + chromosomeContigMatch[1].toUpperCase();
        }

        const ranges = parts[1].split('-');
        this.setContig(contig);
        this.setRange(parseFloat(ranges[0]), parseFloat(ranges[1]));
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
    
    rangeSpecifier: string;

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

        const iconColor = 'rgb(171, 171, 171)';
        const iconHoverColor = 'rgb(255, 255, 255)';
        const iconViewBoxSize = '0 0 32 32';
        
        const closeIcon = this.props.enableClose ? (
            <div style={{
                position: 'absolute',
                right: 0
            }}>
                <IconButton onClick={() => this.props.onClose(this.props.panel)}>
                    <SvgClose color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>
        ) : null;

        const previousIcon =(
            <div style={{
                position: 'absolute',
                left: 0
            }}>
                <IconButton onClick={() => this.props.onPreviousContig(this.props.panel)}>
                    <SvgChevronLeft color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>
        );

        const nextIcon = (
            <div style={{
                position: 'absolute',
                right: 0
            }}>
                <IconButton onClick={() => this.props.onNextContig(this.props.panel)}>
                    <SvgChevronRight color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>
        );

        if (this.props.isEditing) {
            headerContents = (<div style={headerContainerStyle} >
                <span><input
                    onChange={(e) => this.rangeSpecifier = e.target.value}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            this.props.onEditSave(this.rangeSpecifier);
                        }
                    }}
                    type="text"
                    defaultValue={this.props.rangeSpecifier}></input></span>
                <span style={headerStyle}>
                    <SvgCancel 
                        onClick={() => this.props.onEditCancel()} 
                        viewBox={iconViewBoxSize}
                        color={iconColor}
                        hoverColor={iconHoverColor} 
                    />
                </span>
                <span style={headerStyle}>
                    <SvgCheck 
                        onClick={() => this.props.onEditSave(this.rangeSpecifier)} 
                        viewBox={iconViewBoxSize}color={iconColor}
                        hoverColor={iconHoverColor} 
                    />
                </span>
                {closeIcon}
            </div>);
        } else {
            headerContents = (<div style={headerContainerStyle}>
                {this.props.enableContigNavigation ? previousIcon : null}
                <span onClick={() => this.props.onEditStart()}><b>{this.props.contig}</b> {this.props.rangeString}</span>
                <span style={headerStyle} onClick={() => this.props.onEditStart()}>
                    <SvgEdit 
                        viewBox={iconViewBoxSize}
                        color={iconColor}
                        hoverColor={iconHoverColor} 
                    />
                </span>
                {this.props.enableContigNavigation ? nextIcon : null}
            </div>);
        }

        return <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                color: '#e8e8e8',
                backgroundColor: '#171615',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 200,
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