declare module 'genome-browser/ui/core/ReactObject' {
	import Object2D from "engine/ui/Object2D";
	import * as React from "react";
	export class ReactObject extends Object2D {
	    reactUid: number;
	    content: React.ReactNode;
	    containerStyle: React.CSSProperties;
	    protected _content: React.ReactNode;
	    protected _containerStyle: React.CSSProperties;
	    constructor(content?: React.ReactNode, w?: number, h?: number);
	    addSetContentListener(listener: (content: React.ReactNode) => void): void;
	    removeSetContentListener(listener: (...args: Array<any>) => void): void;
	    addWorldTransformUpdatedListener(listener: (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => void): void;
	    removeWorldTransformUpdatedListener(listener: (...args: Array<any>) => void): void;
	    applyWorldTransform(transform: Float32Array | null): void;
	    static uidCounter: number;
	}
	export class ReactObjectContainer extends React.Component<{
	    reactObject: ReactObject;
	    scene: Object2D;
	}, {
	    content: React.ReactNode;
	    worldTransform: Float32Array;
	    computedWidth: number;
	    computedHeight: number;
	    style: React.CSSProperties;
	}> {
	    constructor(props: {
	        reactObject: ReactObject;
	        scene: Object2D;
	    });
	    componentDidMount(): void;
	    componentWillUnmount(): void;
	    render(): JSX.Element;
	    protected updateTransformState: (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => void;
	    protected updateContentState: (content: React.ReactNode) => void;
	}
	export default ReactObject;

}
declare module 'genome-browser/ui/core/AppCanvas' {
	import * as React from "react";
	import GPUDevice from 'engine/rendering/GPUDevice';
	import RenderPass from 'engine/rendering/RenderPass';
	import Renderer from 'engine/rendering/Renderer';
	import { Object2D } from 'engine/ui/Object2D';
	import { ReactObject } from 'genome-browser/ui/core/ReactObject';
	import { InteractionEventMap, InteractionEventInit } from "engine/ui/InteractionEvent";
	interface Props {
	    width: number;
	    height: number;
	    content: Object2D;
	    pixelRatio?: number;
	    style?: React.CSSProperties;
	    canvasStyle?: React.CSSProperties;
	    onWillUnmount?: () => void;
	}
	interface State {
	    reactObjects: Array<ReactObject>;
	}
	/**
	 * AppCanvas
	 * - root scene node and coordinate system
	 * - entry point for canvas rendering
	 * - emits user interaction events on scene nodes
	 */
	export class AppCanvas extends React.Component<Props, State> {
	    protected canvas: HTMLCanvasElement;
	    protected device: GPUDevice;
	    protected renderer: Renderer;
	    protected mainRenderPass: RenderPass;
	    protected scene: Object2D;
	    constructor(props: Props);
	    componentDidMount(): void;
	    componentWillUnmount(): void;
	    componentDidUpdate(prevProps: Props, prevState: State, snapshot: any): void;
	    render(): JSX.Element;
	    renderCanvas(): void;
	    handleUserInteraction(): void;
	    protected updateSceneContent(): void;
	    /**
	     * Apply DOM pixel coordinate system to the scene via a transform on the root node
	     * - Flip z-axis from default OpenGL coordinates so that 1 = in front the screen and -1 is inside the screen
	     * - z coordinates clip outside of -1 to 1
	     * - (0, 0) corresponds to the top-left of the canvas
	     * - (canvas.clientWidth, canvas.clientHeight) corresponds to the bottom left
	     */
	    protected updateSceneTransform(): void;
	    /**
	     * Given bounds in OpenGL display coordinates (clip-space), return the same bounds in DOM pixel coordinates (relative to the canvas)
	     * This applies the inverse of the scene transform
	     */
	    protected worldToCanvasSpaceBounds(worldSpaceBounds: {
	        l: number;
	        r: number;
	        t: number;
	        b: number;
	    }): {
	        l: number;
	        r: number;
	        t: number;
	        b: number;
	    };
	    /**
	     * Converts from canvas-space coordinates into clip-space, which is the world-space of Object2D nodes
	     */
	    protected canvasToWorldSpacePosition(canvasSpacePosition: {
	        x: number;
	        y: number;
	    }): {
	        x: number;
	        y: number;
	    };
	    private _reactObjects;
	    protected updateReactObjects(): void;
	    /**
	     * Returns the event position relative to the canvas
	     */
	    protected mouseEventToCanvasSpacePosition(e: MouseEvent): {
	        x: number;
	        y: number;
	    };
	    protected pointerEventSupport: boolean;
	    protected addInputListeners(): void;
	    protected removeInputListeners(): void;
	    private dragData;
	    protected readonly cursorTarget: HTMLElement;
	    protected activePointers: {
	        [pointerId: number]: {
	            interactionData: InteractionEventInit;
	            sourceEvent: MouseEvent | PointerEvent;
	            lastHitNodes: Set<Object2D>;
	        };
	    };
	    private _cursorStyle;
	    protected resetCursor(): void;
	    protected applyCursor(): void;
	    private _lastActivePointers;
	    protected handlePointerChanges(): void;
	    protected onPointerEnter: (e: MouseEvent | PointerEvent) => void;
	    protected onPointerLeave: (e: MouseEvent | PointerEvent) => void;
	    protected onPointerMove: (e: MouseEvent | PointerEvent) => void;
	    protected onPointerDown: (e: MouseEvent | PointerEvent) => void;
	    protected onPointerUp: (e: MouseEvent | PointerEvent) => void;
	    protected onClick: (e: MouseEvent) => void;
	    protected onDoubleClick: (e: MouseEvent) => void;
	    protected onWheel: (e: WheelEvent) => void;
	    private _hitNodes;
	    protected hitTestNodesForInteraction<K extends keyof InteractionEventMap>(interactionEventNames: Array<K>, worldX: number, worldY: number): Array<Object2D>;
	    protected executePointerInteraction<K extends keyof InteractionEventMap>(nodes: Iterable<Object2D>, interactionEventName: K, interactionData: InteractionEventInit, constructEvent: (init: InteractionEventInit) => InteractionEventMap[K], setCursor?: boolean): boolean;
	    protected interactionDataFromEvent(e: MouseEvent | PointerEvent): InteractionEventInit;
	    protected compareZ(a: Object2D, b: Object2D): number;
	}
	export default AppCanvas;

}
declare module 'genome-browser/model/GenomicLocation' {
	export type GenomicLocation = {
	    contig: string;
	    x0: number;
	    x1: number;
	};

}
declare module 'genome-browser/model/TrackModel' {
	import { Strand } from "valis";
	/**
	 * Should be plain-old-data and easy to serialize
	 * - Should encapsulate complete state, excluding transitive UI state
	 * - Applying a TrackModel state should restore state exactly
	 */
	export type TrackModel<TrackType extends keyof TrackTypeMap = keyof TrackTypeMap> = {
	    type: TrackType;
	    name: string;
	} & TrackTypeMap[TrackType];
	export interface TrackTypeMap {
	    'empty': {};
	    'sequence': {};
	    'annotation': {
	        strand: Strand;
	    };
	    'variant': {
	        query?: any;
	    };
	    'interval': {
	        query: any;
	        tileStoreType: string;
	        blendEnabled: boolean;
	    };
	}
	export default TrackModel;

}
declare module 'genome-browser/ui/font/Fonts' {
	export const OpenSansRegular: any;

}
declare module 'genome-browser/model/data-store/TileStore' {
	/// <reference types="node" />
	import { EventEmitter } from "events";
	export class TileStore<TilePayload, BlockPayload> {
	    readonly tileWidth: number;
	    readonly tilesPerBlock: number;
	    maximumX: number;
	    protected lods: Blocks<TilePayload, BlockPayload>[];
	    protected readonly blockSize: number;
	    constructor(tileWidth?: number, tilesPerBlock?: number, maximumX?: number);
	    getTiles(x0: number, x1: number, samplingDensity: number, requestData: boolean, callback: (tile: Tile<TilePayload>) => void): void;
	    getTile(x: number, samplingDensity: number, requestData: boolean): Tile<TilePayload>;
	    isWithinInitializedLodRange(samplingDensity: number): boolean;
	    getBlockPayload(tile: Tile<TilePayload>): BlockPayload;
	    clear(): void;
	    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
	    protected createBlockPayload(lodLevel: number, lodX: number, lodSpan: number, rows: number): BlockPayload;
	    protected releaseBlockPayload(block: BlockPayload): void;
	    protected mapLodLevel(selectedLodLevel: number): number;
	    private getTileFromLodX;
	    private loadTilePayload;
	    private tileLoadComplete;
	    private tileLoadFailed;
	    private getBlock;
	    private getBlocks;
	    private tileRowIndex;
	    private blockIndex;
	    private blockId;
	} type Blocks<TilePayload, BlockPayload> = {
	    [blockId: string]: Block<TilePayload, BlockPayload>;
	};
	export type Block<TilePayload, BlockPayload> = {
	    lastUsedTimestamp: number;
	    rows: Array<Tile<TilePayload>>;
	    payload: BlockPayload;
	};
	export enum TileState {
	    Empty = 0,
	    Loading = 1,
	    Complete = 2
	}
	export interface TileEventMap<Payload> {
	    'complete': (tile: Tile<Payload>, payload: Payload) => void;
	    'load-failed': (tile: Tile<Payload>, reason: string) => void;
	}
	export class Tile<Payload> {
	    readonly block: Block<Payload, any>;
	    readonly lodLevel: number;
	    readonly lodX: number;
	    readonly lodSpan: number;
	    readonly blockRowIndex: number;
	    state: TileState;
	    payload: Payload | null;
	    readonly x: number;
	    readonly span: number;
	    readonly key: string;
	    protected _state: TileState;
	    protected _payload: Payload;
	    protected eventEmitter: EventEmitter;
	    constructor(block: Block<Payload, any>, lodLevel: number, lodX: number, lodSpan: number, blockRowIndex: number);
	    addEventListener<EventName extends keyof TileEventMap<Payload>>(event: EventName, callback: TileEventMap<Payload>[EventName]): void;
	    removeEventListener<EventName extends keyof TileEventMap<Payload>>(event: EventName, callback: TileEventMap<Payload>[EventName]): void;
	    markLastUsed(): void;
	    protected emitComplete(): void;
	    protected emitLoadFailed(reason: string): void;
	}
	export default TileStore;

}
declare module 'genome-browser/ui/track/BaseTrack' {
	import UsageCache from "engine/ds/UsageCache";
	import { Tile } from 'genome-browser/model/data-store/TileStore';
	import { TrackModel, TrackTypeMap } from 'genome-browser/model/TrackModel';
	import Rect from "engine/ui/Rect";
	import Text from "engine/ui/Text";
	export class TrackObject<ModelType extends keyof TrackTypeMap = keyof TrackTypeMap> extends Rect {
	    protected model: TrackModel<ModelType>;
	    protected contig: string | undefined;
	    protected x0: number;
	    protected x1: number;
	    protected defaultCursor: string;
	    protected axisPointers: {
	        [id: string]: AxisPointer;
	    };
	    protected activeAxisPointerColor: number[];
	    protected secondaryAxisPointerColor: number[];
	    protected focusRegionRectLeft: Rect;
	    protected focusRegionRectRight: Rect;
	    protected loadingIndicator: LoadingIndicator;
	    protected displayNeedUpdate: boolean;
	    constructor(model: TrackModel<ModelType>);
	    setContig(contig: string): void;
	    setRange(x0: number, x1: number): void;
	    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle): void;
	    removeAxisPointer(id: string): void;
	    setFocusRegion(x0_fractional: number, x1_fractional: number): void;
	    disableFocusRegion(): void;
	    private _lastComputedWidth;
	    applyTransformToSubNodes(root?: boolean): void;
	    protected _pendingTiles: UsageCache<Tile<any>>;
	    protected updateDisplay(): void;
	    /**
	     * Show or hide the loading indicator via animation
	     * This function can be safely called repeatedly without accounting for the current state of the indicator
	     */
	    protected toggleLoadingIndicator(visible: boolean, animate: boolean): void;
	    protected createTileLoadingDependency: (tile: Tile<any>) => Tile<any>;
	    protected removeTileLoadingDependency: (tile: Tile<any>) => void;
	    protected onDependentTileComplete: () => void;
	}
	export enum AxisPointerStyle {
	    Active = 0,
	    Secondary = 1
	} class AxisPointer extends Rect {
	    readonly activeColor: ArrayLike<number>;
	    readonly secondaryColor: ArrayLike<number>;
	    readonly style: AxisPointerStyle;
	    constructor(style: AxisPointerStyle, activeColor: ArrayLike<number>, secondaryColor: ArrayLike<number>);
	    setStyle(style: AxisPointerStyle): void;
	} class LoadingIndicator extends Text {
	    constructor();
	}
	export default TrackObject;

}
declare module 'genome-browser/ui/XAxis' {
	import Object2D from "engine/ui/Object2D";
	import Rect from "engine/ui/Rect";
	import Text from "engine/ui/Text";
	import { Renderable } from "engine/rendering/Renderable";
	import { UsageCache } from "engine/ds/UsageCache";
	export class XAxis extends Object2D {
	    protected fontPath: string;
	    protected offset: number;
	    protected snap: number;
	    protected startFrom: number;
	    maxMajorTicks: number;
	    maxTextLength: number;
	    fontSizePx: number;
	    minDisplay: number;
	    maxDisplay: number;
	    protected x0: number;
	    protected x1: number;
	    protected _fontSizePx: number;
	    protected _maxTextLength: number;
	    protected labelsNeedUpdate: boolean;
	    protected lastComputedWidth: number;
	    protected clippingMask: Rect;
	    protected labelCache: UsageCache<Label>;
	    constructor(x0: number, x1: number, fontSizePx: number, fontPath: string, offset?: number, snap?: number, startFrom?: number);
	    setRange(x0: number, x1: number): void;
	    applyTransformToSubNodes(root?: boolean): void;
	    protected updateLabels(): void;
	    protected createLabel: (str: string) => Label;
	    protected deleteLabel: (label: Label) => void;
	    /**
	     * Convert a number to a fixed point representation by truncating instead of rounding
	     *
	     * For example:
	     *  - `toFixedTrunc(999.996, 2) => "999.99"`
	     *  - `toFixedTrunc(999.996, 5) => "999.99600"`
	     *  - `toFixedTrunc(999.996, 0) => "999"`
	     */
	    static toFixedTrunc(x: number, decimalPoints: number): string;
	    static siPrefixes: {
	        [key: string]: string;
	    };
	    static formatValue(x: number, maxLength: number): string;
	} class Label extends Object2D {
	    text: Text;
	    tick: Rect;
	    constructor(fontPath: string, string: string, fontSizePx: number);
	    setColor(r: number, g: number, b: number, a: number): void;
	    setMask(mask: Renderable<any>): void;
	    releaseGPUResources(): void;
	}
	export default XAxis;

}
declare module 'genome-browser/ui/Panel' {
	import { InteractionEvent, WheelInteractionEvent } from "engine/ui/InteractionEvent";
	import Object2D from "engine/ui/Object2D";
	import ReactObject from 'genome-browser/ui/core/ReactObject';
	import Rect from "engine/ui/Rect";
	import TrackObject from 'genome-browser/ui/track/BaseTrack';
	import XAxis from 'genome-browser/ui/XAxis'; enum DragMode {
	    Move = 0,
	    SelectRegion = 1
	}
	export interface PanelInternal {
	    setSecondaryAxisPointers(secondaryAxisPointers: {
	        [pointerId: string]: number;
	    }): void;
	}
	export class Panel extends Object2D {
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
	    readonly trackViews: Set<TrackObject<"empty" | "sequence" | "annotation" | "variant" | "interval">>;
	    closable: boolean;
	    closing: boolean;
	    protected _closable: boolean;
	    protected _closing: boolean;
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
	    protected formattedContig: string;
	    protected isEditing: boolean;
	    protected availableContigs: Array<string>;
	    constructor(onClose: (t: Panel) => void, spacing: {
	        x: number;
	        y: number;
	    }, panelHeaderHeight: number, xAxisHeight: number);
	    setResizable(v: boolean): void;
	    addTrackView(trackView: TrackObject): void;
	    removeTrackView(trackView: TrackObject): void;
	    setContig(contig: string): void;
	    setRange(x0: number, x1: number, animate?: boolean): void;
	    setAvailableContigs(contigs: Array<string>): void;
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

}
declare module 'genome-browser/model/data-store/AnnotationTileStore' {
	import { Tile, TileStore } from 'genome-browser/model/data-store/TileStore';
	import { AnnotationTileset } from "valis"; type GeneInfo = AnnotationTileset.GeneInfo; type TranscriptComponentInfo = AnnotationTileset.TranscriptComponentInfo; type TranscriptInfo = AnnotationTileset.TranscriptInfo;
	export type Gene = GeneInfo & {
	    transcripts: Array<Transcript>;
	};
	export type Transcript = TranscriptInfo & {
	    exon: Array<TranscriptComponentInfo>;
	    cds: Array<TranscriptComponentInfo>;
	    utr: Array<TranscriptComponentInfo>;
	    other: Array<TranscriptComponentInfo>;
	};
	export type TilePayload = Array<Gene>;
	export class AnnotationTileStore extends TileStore<TilePayload, void> {
	    protected contig: string;
	    protected macro: boolean;
	    constructor(contig: string, tileSize?: number, macro?: boolean);
	    protected mapLodLevel(l: number): number;
	    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
	}
	export class MacroAnnotationTileStore extends AnnotationTileStore {
	    constructor(sourceId: string);
	}
	export default AnnotationTileStore;

}
declare module 'genome-browser/model/data-store/SharedTileStores' {
	import { TileStore } from 'genome-browser/model/data-store/TileStore';
	export class SharedTileStore {
	    private static tileStores;
	    static getTileStore<T extends TileStore<any, any>>(type: string, sourceKey: string, constructor: (sourceId: string) => T): T;
	    static clear(type: string): void;
	    static clearAll(): void;
	}
	export default SharedTileStore;

}
declare module 'genome-browser/ui/track/util/IntervalInstances' {
	import GPUDevice, { AttributeLayout, VertexAttributeBuffer } from "engine/rendering/GPUDevice";
	import { DrawContext } from "engine/rendering/Renderer";
	import Object2DInstances from "engine/ui/Object2DInstances";
	export type IntervalInstance = {
	    xFractional: number;
	    y: number;
	    z: number;
	    wFractional: number;
	    h: number;
	    color: Array<number>;
	};
	export default class IntervalInstances extends Object2DInstances<IntervalInstance> {
	    minWidth: number;
	    blendFactor: number;
	    borderStrength: number;
	    constructor(instances: Array<IntervalInstance>);
	    draw(context: DrawContext): void;
	    protected allocateGPUVertexState(device: GPUDevice, attributeLayout: AttributeLayout, instanceVertexAttributes: {
	        [name: string]: VertexAttributeBuffer;
	    }): import("engine/rendering/GPUDevice").GPUVertexState;
	    protected getVertexCode(): string;
	    protected getFragmentCode(): string;
	}

}
declare module 'genome-browser/ui/track/AnnotationTrack' {
	/// <reference types="react" />
	import UsageCache from "engine/ds/UsageCache";
	import { AnnotationTileStore } from 'genome-browser/model/data-store/AnnotationTileStore';
	import TrackModel from 'genome-browser/model/TrackModel';
	import Object2D from "engine/ui/Object2D";
	import TrackObject from 'genome-browser/ui/track/BaseTrack';
	import IntervalInstances from 'genome-browser/ui/track/util/IntervalInstances';
	/**
	 * WIP Annotation tracks:
	 *
	 * Todo:
	 * - Convert micro-scale annotations to use instancing (and text batching)
	 * - Merge shaders where possible and clean up
	 */
	export class AnnotationTrack extends TrackObject<'annotation'> {
	    protected readonly macroLodBlendRange: number;
	    protected readonly macroLodThresholdLow: number;
	    protected readonly macroLodThresholdHigh: number;
	    protected readonly namesLodBlendRange: number;
	    protected readonly namesLodThresholdLow: number;
	    protected readonly namesLodThresholdHigh: number;
	    protected annotationStore: AnnotationTileStore;
	    protected macroAnnotationStore: AnnotationTileStore;
	    protected pointerState: TrackPointerState;
	    constructor(model: TrackModel<'annotation'>);
	    setContig(contig: string): void;
	    protected _macroTileCache: UsageCache<IntervalInstances>;
	    protected _annotationCache: UsageCache<Object2D>;
	    protected _onStageAnnotations: UsageCache<Object2D>;
	    protected updateDisplay(): void;
	    protected updateMacroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number): void;
	    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, continuousLodLevel: number, opacity: number): void;
	    protected addAnnotation: (annotation: Object2D) => void;
	    protected removeAnnotation: (annotation: Object2D) => void;
	    protected deleteAnnotation: (annotation: Object2D) => void;
	    protected annotationKey: (feature: {
	        soClass: import("react").ReactText;
	        name?: string;
	        startIndex: number;
	        length: number;
	    }) => string;
	} type TrackPointerState = {
	    pointerOver: boolean;
	};
	export default AnnotationTrack;

}
declare module 'genome-browser/model/data-store/SequenceTileStore' {
	import GPUDevice, { GPUTexture } from "engine/rendering/GPUDevice";
	import TileStore, { Tile } from 'genome-browser/model/data-store/TileStore';
	export type TilePayload = {
	    array: Uint8Array;
	    sequenceMinMax: {
	        min: number;
	        max: number;
	    };
	    dataUploaded: boolean;
	    getTexture(device: GPUDevice): GPUTexture;
	};
	export type BlockPayload = {
	    _gpuTexture: GPUTexture;
	    getTexture(device: GPUDevice): GPUTexture;
	};
	export class SequenceTileStore extends TileStore<TilePayload, BlockPayload> {
	    protected sourceId: string;
	    constructor(sourceId: string);
	    protected mapLodLevel(l: number): number;
	    protected getTilePayload(tile: Tile<TilePayload>): Promise<{
	        dataUploaded: boolean;
	        getTexture(device: GPUDevice): GPUTexture;
	        array: Uint8Array;
	        sequenceMinMax: {
	            min: number;
	            max: number;
	        };
	        indicesPerBase: number;
	    }>;
	    protected createBlockPayload(lodLevel: number, lodX: number, tileWidth: number, rows: number): BlockPayload;
	    protected releaseBlockPayload(payload: BlockPayload): void;
	}
	export default SequenceTileStore;

}
declare module 'genome-browser/ui/UIConstants' {
	export const DEFAULT_SPRING: {
	    tension: number;
	    friction: number;
	};

}
declare module 'genome-browser/ui/track/ShaderTrack' {
	import UsageCache from "engine/ds/UsageCache";
	import TrackModel from 'genome-browser/model/TrackModel';
	import Object2D from "engine/ui/Object2D";
	import TileStore, { Tile } from 'genome-browser/model/data-store/TileStore';
	import { TrackObject } from 'genome-browser/ui/track/BaseTrack';
	/**
	 * TileTrack provides a base class for Tracks that use TileStore
	 */
	export class ShaderTrack<TilePayload, BlockPayload> extends TrackObject {
	    protected tileStoreType: string;
	    protected tileStoreConstructor: (contig: string) => TileStore<TilePayload, BlockPayload>;
	    pixelRatio: number;
	    protected densityMultiplier: number;
	    protected tileStore: TileStore<TilePayload, BlockPayload>;
	    protected _pixelRatio: number;
	    constructor(model: TrackModel, tileStoreType: string, tileStoreConstructor: (contig: string) => TileStore<TilePayload, BlockPayload>);
	    setContig(contig: string): void;
	    protected constructTileNode(): TileNode<TilePayload>;
	    protected _tileNodeCache: UsageCache<TileNode<TilePayload>>;
	    protected updateDisplay(): void;
	    protected createTileNode: () => TileNode<TilePayload>;
	    protected deleteTileNode: (tileNode: TileNode<TilePayload>) => void;
	    protected updateTileNode(tileNode: TileNode<TilePayload>, tile: Tile<any>, x0: number, span: number, displayLodLevel: number): void;
	    protected tileNodeIsOpaque(tileNode: TileNode<any>): boolean;
	}
	export class TileNode<TilePayload> extends Object2D {
	    opacity: number;
	    displayLodLevel: number;
	    protected _opacity: number;
	    protected tile: Tile<TilePayload>;
	    constructor();
	    setTile(tile: Tile<TilePayload>): void;
	    getTile(): Tile<TilePayload>;
	    protected tileCompleteListener: () => void;
	    protected onTileComplete(): void;
	}
	export default ShaderTrack;

}
declare module 'genome-browser/ui/track/util/TextClone' {
	import Object2D from "engine/ui/Object2D";
	import { Text } from "engine/ui/Text";
	import { DrawContext } from "engine/rendering/Renderer";
	import GPUDevice from "engine/rendering/GPUDevice";
	/**
	 * If we're repeating the same text a lot we can improve performance by having a single text instance and re-rendering it at different locations
	 *
	 * **The original text instance is modified an should not be rendered on its own after using in a TextClone**
	 */
	export class TextClone extends Object2D {
	    readonly text: Text;
	    color: Float32Array;
	    additiveBlendFactor: number;
	    _w: number;
	    _h: number;
	    render: boolean;
	    constructor(text: Text, color?: ArrayLike<number>);
	    onAdded(): void;
	    allocateGPUResources(device: GPUDevice): void;
	    releaseGPUResources(): void;
	    draw(context: DrawContext): void;
	    protected glyphLayoutChanged: () => void;
	}
	export default TextClone;

}
declare module 'genome-browser/ui/track/SequenceTrack' {
	import { BlockPayload, TilePayload } from 'genome-browser/model/data-store/SequenceTileStore';
	import { Tile } from 'genome-browser/model/data-store/TileStore';
	import { TrackModel } from 'genome-browser/model/TrackModel';
	import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
	import { DrawContext } from "engine/rendering/Renderer";
	import Object2D from "engine/ui/Object2D";
	import { Text } from "engine/ui/Text";
	import { ShaderTrack, TileNode } from 'genome-browser/ui/track/ShaderTrack';
	import { TextClone } from 'genome-browser/ui/track/util/TextClone';
	export class SequenceTrack extends ShaderTrack<TilePayload, BlockPayload> {
	    protected densityMultiplier: number;
	    constructor(model: TrackModel);
	    protected constructTileNode(): SequenceTile;
	} class SequenceTile extends TileNode<TilePayload> {
	    protected gpuTexture: GPUTexture;
	    protected memoryBlockY: number;
	    constructor();
	    setTile(tile: Tile<TilePayload>): void;
	    private _lastComputedWidth;
	    private _lastComputedX;
	    applyTransformToSubNodes(root?: boolean): void;
	    allocateGPUResources(device: GPUDevice): void;
	    releaseGPUResources(): void;
	    draw(context: DrawContext): void;
	    private _labelCache;
	    protected updateLabels(): void;
	    protected createLabel: (baseCharacter: string) => {
	        container: Object2D;
	        text: TextClone;
	    };
	    protected deleteLabel: (label: {
	        container: Object2D;
	        text: TextClone;
	    }) => void;
	    protected onTileComplete(): void;
	    protected static attributeLayout: {
	        name: string;
	        type: AttributeType;
	    }[];
	    protected static vertexShader: string;
	    protected static fragmentShader: string;
	    protected static baseTextInstances: {
	        [key: string]: Text;
	    };
	}
	export default SequenceTrack;

}
declare module 'genome-browser/model/data-store/VariantTileStore' {
	import { TrackModel } from 'genome-browser/model/TrackModel';
	import { Tile, TileStore } from 'genome-browser/model/data-store/TileStore';
	export type TilePayload = Array<{
	    id: string;
	    baseIndex: number;
	    refSequence: string;
	    alts: string[];
	}>;
	export class VariantTileStore extends TileStore<TilePayload, void> {
	    protected model: TrackModel<'variant'>;
	    protected contig: string;
	    constructor(model: TrackModel<'variant'>, contig: string);
	    protected mapLodLevel(l: number): number;
	    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
	}
	export default VariantTileStore;

}
declare module 'genome-browser/ui/track/VariantTrack' {
	import UsageCache from "engine/ds/UsageCache";
	import { VariantTileStore } from 'genome-browser/model/data-store/VariantTileStore';
	import { TrackModel } from 'genome-browser/model/TrackModel';
	import Object2D from "engine/ui/Object2D";
	import { Rect } from "engine/ui/Rect";
	import { Text } from "engine/ui/Text";
	import TrackObject from 'genome-browser/ui/track/BaseTrack';
	import IntervalInstances from 'genome-browser/ui/track/util/IntervalInstances';
	import TextClone from 'genome-browser/ui/track/util/TextClone';
	export default class VariantTrack extends TrackObject<'variant'> {
	    protected readonly macroLodBlendRange: number;
	    protected readonly macroLodThresholdLow: number;
	    protected readonly macroLodThresholdHigh: number;
	    protected tileStore: VariantTileStore;
	    protected pointerOverTrack: boolean;
	    constructor(model: TrackModel<'variant'>);
	    setContig(contig: string): void;
	    protected _microTileCache: UsageCache<IntervalInstances>;
	    protected _onStageAnnotations: UsageCache<Object2D>;
	    protected _sequenceLabelCache: UsageCache<{
	        root: Object2D;
	        textParent: Object2D;
	        text: TextClone;
	    }>;
	    protected updateDisplay(): void;
	    protected displayLabel(variantId: string, baseCharacter: string, color: ArrayLike<number>, startIndex: number, altIndex: number, charIndex: number, layoutParentX: number, baseLayoutW: number, altHeightPx: number, textSizePx: number, textOpacity: number, tileY: number): void;
	    protected createBaseLabel: (baseCharacter: string, color: ArrayLike<number>, onClick: () => void) => {
	        root: Rect;
	        textParent: Object2D;
	        text: TextClone;
	    };
	    protected deleteBaseLabel: (label: {
	        root: Object2D;
	        textParent: Object2D;
	        text: TextClone;
	    }) => void;
	    protected static baseTextInstances: {
	        [key: string]: Text;
	    };
	}

}
declare module 'genome-browser/model/data-store/GenericIntervalTileStore' {
	import { Tile, TileStore } from 'genome-browser/model/data-store/TileStore';
	export type TilePayload = Float32Array;
	/**
	 * GenericIntervalTileStore makes it possible to transform a query result into tiles containing intervals
	 *
	 * It has two tile levels, micro and macro
	 *
	 * Micro tiles have lod 0 and are used to store intervals with base-pair precision
	 *
	 * Macro tile have lod level `this.macroLodLevel` and store many more intervals but with lower precision (not enough to display with base-pair precision)
	 */
	export default class GenericIntervalTileStore extends TileStore<TilePayload, void> {
	    protected contig: string;
	    protected query: any;
	    protected tileSize: number;
	    microLodThreshold: number;
	    macroLodLevel: number;
	    constructor(contig: string, query: any, tileSize?: number);
	    protected mapLodLevel(l: number): number;
	    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload;
	}

}
declare module 'genome-browser/ui/track/IntervalTrack' {
	import UsageCache from "engine/ds/UsageCache";
	import GenericIntervalTileStore from 'genome-browser/model/data-store/GenericIntervalTileStore';
	import { Tile } from 'genome-browser/model/data-store/TileStore';
	import { TrackModel } from 'genome-browser/model/TrackModel';
	import { Object2D } from "engine/ui/Object2D";
	import TrackObject from 'genome-browser/ui/track/BaseTrack';
	import IntervalInstances from 'genome-browser/ui/track/util/IntervalInstances'; type TilePayload = Float32Array;
	export default class IntervalTrack extends TrackObject<'interval'> {
	    blendEnabled: boolean;
	    protected tileStore: GenericIntervalTileStore;
	    constructor(model: TrackModel<'interval'>);
	    setContig(contig: string): void;
	    setBlendMode(enabled: boolean): void;
	    protected _pendingTiles: UsageCache<Tile<any>>;
	    protected _intervalTileCache: UsageCache<IntervalInstances>;
	    protected _onStage: UsageCache<Object2D>;
	    protected updateDisplay(): void;
	    protected displayTileNode(tile: Tile<TilePayload>, z: number, x0: number, span: number, continuousLodLevel: number): void;
	    protected createTileNode(tile: Tile<TilePayload>): IntervalInstances;
	    protected removeTile: (tile: IntervalInstances) => void;
	}
	export {};

}
declare module 'genome-browser/ui/track/ConstructTrack' {
	import { TrackModel } from 'genome-browser/model/TrackModel';
	import TrackObject from 'genome-browser/ui/track/BaseTrack';
	export function ConstructTrack(model: TrackModel): TrackObject<"empty" | "sequence" | "annotation" | "variant" | "interval">;
	export default ConstructTrack;

}
declare module 'genome-browser/ui/TrackViewer' {
	import { GenomicLocation } from 'genome-browser/model/GenomicLocation';
	import TrackModel from 'genome-browser/model/TrackModel';
	import Object2D from "engine/ui/Object2D";
	import ReactObject from 'genome-browser/ui/core/ReactObject';
	import Rect from "engine/ui/Rect";
	import Panel from 'genome-browser/ui/Panel';
	import TrackObject from 'genome-browser/ui/track/BaseTrack';
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
	export default class TrackViewer extends Object2D {
	    readonly trackHeaderWidth: number;
	    readonly panelHeaderHeight: number;
	    readonly spacing: {
	        x: number;
	        y: number;
	    };
	    readonly xAxisHeight: number;
	    readonly minPanelWidth: number;
	    readonly minTrackHeight: number;
	    protected panels: Set<Panel>;
	    protected tracks: Track[];
	    protected panelEdges: number[];
	    protected rowOffsetY: number;
	    /** used to collectively position panels and track tiles */
	    protected grid: Object2D;
	    protected addPanelButton: ReactObject;
	    constructor();
	    addTrack(model: TrackModel, heightPx?: number, animate?: boolean): Track;
	    closeTrack(track: Track, animate?: boolean, onComplete?: () => void): void;
	    addPanel(location: GenomicLocation, animate?: boolean): void;
	    closePanel(panel: Panel, animate?: boolean, onComplete?: () => void): void;
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
	}
	export class Track {
	    readonly model: TrackModel;
	    protected _heightPx: number;
	    protected onHeightChanged: () => void;
	    readonly closing: boolean;
	    heightPx: number;
	    protected rowObject: RowObject;
	    constructor(model: TrackModel, _heightPx: number, onHeightChanged: () => void);
	} class RowObject {
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
	    readonly trackViews: Set<TrackObject<"empty" | "sequence" | "annotation" | "variant" | "interval">>;
	    y: number;
	    h: number;
	    title: string;
	    protected _y: number;
	    protected _h: number;
	    protected _title: string;
	    protected _headerIsExpandedState: boolean | undefined;
	    constructor(title: string, spacing: {
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
	export {};

}
declare module 'genome-browser/GenomeBrowser' {
	import * as React from "react";
	import AppCanvas from 'genome-browser/ui/core/AppCanvas';
	import TrackViewer, { TrackViewerConfiguration, Track } from 'genome-browser/ui/TrackViewer';
	import { TrackModel } from 'genome-browser/model/TrackModel';
	export interface GenomeBrowserConfiguration extends TrackViewerConfiguration {
	}
	export interface GenomeBrowserRenderProps {
	    width: number;
	    height: number;
	    pixelRatio?: number;
	    style?: React.CSSProperties;
	}
	export default class GenomeBrowser {
	    protected trackViewer: TrackViewer;
	    protected appCanvasRef: AppCanvas;
	    constructor(configuration?: GenomeBrowserConfiguration);
	    setConfiguration(configuration: GenomeBrowserConfiguration): void;
	    getConfiguration(): TrackViewerConfiguration;
	    addTrack(model: TrackModel, heightPx?: number, animateIn?: boolean): Track;
	    closeTrack(track: Track, animateOut: boolean, onComplete: () => void): void;
	    getTracks(): Track[];
	    getPanels(): Set<import("./ui/Panel").Panel>;
	    render(props: GenomeBrowserRenderProps): JSX.Element;
	    private _frameLoopHandle;
	    protected startFrameLoop(): void;
	    protected stopFrameLoop(): void;
	    protected frameLoop: () => void;
	}

}
