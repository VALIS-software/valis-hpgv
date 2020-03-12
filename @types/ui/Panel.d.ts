import { InteractionEvent, WheelInteractionEvent } from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import { InternalDataSource } from "../data-source/InternalDataSource";
import { Contig } from "../model";
import TrackObject from "../track/TrackObject";
import ReactObject from "./core/ReactObject";
import Axis from "./Axis";
import { StyleProxy } from "./util";
declare enum DragMode {
    Move = 0,
    SelectRegion = 1
}
export interface PanelInternal {
    setSecondaryAxisPointers(secondaryAxisPointers: {
        [pointerId: string]: number;
    }): void;
}
export declare class Panel extends Object2D {
    protected onClose: (t: Panel) => void;
    protected readonly spacing: {
        x: number;
        y: number;
    };
    protected readonly panelHeaderHeight: number;
    protected readonly xAxisHeight: number;
    column: number;
    maxRange: number;
    minRange: number;
    clampToTracks: boolean;
    readonly header: ReactObject;
    readonly xAxis: Axis;
    readonly resizeHandle: Rect;
    readonly trackViews: Set<TrackObject<import("../track/TrackModel").TrackModel, import("../track/TileLoader").TileLoader<any, any>>>;
    closable: boolean;
    closing: boolean;
    protected _closable: boolean;
    protected _closing: boolean;
    protected dataSource: InternalDataSource;
    readonly contig: string;
    readonly x0: number;
    readonly x1: number;
    protected activeAxisPointers: {
        [pointerId: string]: number;
    };
    protected secondaryAxisPointers: {
        [pointerId: string]: number;
    };
    protected tileDragging: boolean;
    protected tileHovering: boolean;
    protected isEditing: boolean;
    protected availableContigs: ReadonlyArray<Contig>;
    constructor(onClose: (t: Panel) => void, spacing: {
        x: number;
        y: number;
    }, panelHeaderHeight: number, xAxisHeight: number, dataSource: InternalDataSource);
    applyStyle(styleProxy: StyleProxy): void;
    setResizable(v: boolean): void;
    addTrackView(trackView: TrackObject): void;
    removeTrackView(trackView: TrackObject): void;
    private _dataSourceId;
    setDataSource(dataSource: InternalDataSource): void;
    setContig(contig: string): void;
    setRange(x0: number, x1: number, animate?: boolean): void;
    protected setAvailableContigs(contigs: Array<Contig>): void;
    protected getFormattedContig(contigId: string): string;
    protected setSecondaryAxisPointers(secondaryAxisPointers: {
        [pointerId: string]: number;
    }): void;
    private _rangeAnimationObject;
    private setRangeImmediate;
    protected applyLimits(x0: number, x1: number): {
        x0: number;
        x1: number;
    };
    protected onTrackLeave: (e: InteractionEvent) => void;
    protected onTrackPointerMove: (e: InteractionEvent) => void;
    protected onTrackWheel: (e: WheelInteractionEvent) => void;
    protected _dragMode: DragMode | undefined;
    protected _dragXF0: number;
    protected _dragX00: number;
    protected _lastDragLX: number;
    protected _dragDistLocal: number;
    protected onTrackDragStart: (e: InteractionEvent) => void;
    protected onTrackDragMove: (e: InteractionEvent) => void;
    protected onTrackDragEnd: (e: InteractionEvent) => void;
    protected setActiveAxisPointer(e: InteractionEvent): void;
    protected removeActiveAxisPointer(e: InteractionEvent): void;
    protected fillX(obj: Object2D): void;
    protected availableContigAtOffset: (contig: string, offset: number) => string;
    protected updatePanelHeader(): void;
    protected finishEditing(rangeSpecifier?: string): void;
    protected startEditing(): void;
    protected setRangeUsingRangeSpecifier(specifier: string): void;
}
export declare class PanelEvent<Type extends string> {
    readonly type: Type;
    readonly panel: Panel;
    readonly defaultPrevented: boolean;
    constructor(type: Type, panel: Panel);
    preventDefault: () => void;
    protected _defaultPrevented: boolean;
}
export declare class SelectRegionEvent extends PanelEvent<'select-region'> {
    readonly contig: string;
    /**
     * Selection start in base-pairs
     */
    readonly x0: number;
    /**
     * Selection end in base-pairs
     */
    readonly x1: number;
    /**
     * Location of selection start relative to the panel view, where 0 left most edge and 1 is rightmost
     */
    readonly x0ViewFraction: number;
    /**
     * Location of selection end relative to the panel view, where 0 left most edge and 1 is rightmost
     */
    readonly x1ViewFraction: number;
    constructor(panel: Panel, contig: string, 
    /**
     * Selection start in base-pairs
     */
    x0: number, 
    /**
     * Selection end in base-pairs
     */
    x1: number, 
    /**
     * Location of selection start relative to the panel view, where 0 left most edge and 1 is rightmost
     */
    x0ViewFraction: number, 
    /**
     * Location of selection end relative to the panel view, where 0 left most edge and 1 is rightmost
     */
    x1ViewFraction: number);
}
export default Panel;
