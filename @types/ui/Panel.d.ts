import { InteractionEvent, WheelInteractionEvent } from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "engine/ui/Rect";
import TrackObject from "../track/TrackObject";
import XAxis from "./XAxis";
import { Contig } from "../model";
import { InternalDataSource } from "../data-source/InternalDataSource";
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
    readonly header: ReactObject;
    readonly xAxis: XAxis;
    readonly resizeHandle: Rect;
    readonly trackViews: Set<TrackObject<import("../track/TrackModel").TrackModel, import("../track/TileCache").TileCache<any, any>>>;
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
    setResizable(v: boolean): void;
    addTrackView(trackView: TrackObject): void;
    removeTrackView(trackView: TrackObject): void;
    private _dataSourceId;
    setDataSource(dataSource: InternalDataSource): void;
    setContig(contig: string): void;
    setRange(x0: number, x1: number, animate?: boolean): void;
    protected setAvailableContigs(contigs: Array<Contig>): void;
    protected getFormattedContig(contig: string): string;
    protected setSecondaryAxisPointers(secondaryAxisPointers: {
        [pointerId: string]: number;
    }): void;
    private _rangeAnimationObject;
    private setRangeImmediate;
    protected onTileLeave: (e: InteractionEvent) => void;
    protected onTilePointerMove: (e: InteractionEvent) => void;
    protected onTileWheel: (e: WheelInteractionEvent) => void;
    protected _dragMode: DragMode | undefined;
    protected _dragXF0: number;
    protected _dragX00: number;
    protected _lastDragLX: number;
    protected _dragDistLocal: number;
    protected onTileDragStart: (e: InteractionEvent) => void;
    protected onTileDragMove: (e: InteractionEvent) => void;
    protected onTileDragEnd: (e: InteractionEvent) => void;
    protected setActiveAxisPointer(e: InteractionEvent): void;
    protected removeActiveAxisPointer(e: InteractionEvent): void;
    protected fillX(obj: Object2D): void;
    protected availableContigAtOffset: (contig: string, offset: number) => string;
    protected updatePanelHeader(): void;
    protected finishEditing(rangeSpecifier?: string): void;
    protected startEditing(): void;
    protected setRangeUsingRangeSpecifier(specifier: string): void;
}
export default Panel;
