import UsageCache from "engine/ds/UsageCache";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { InternalDataSource } from "../data-source/InternalDataSource";
import { Tile, TileLoader } from "./TileLoader";
import { TrackModel } from "./TrackModel";
import { StyleProxy } from "../ui/util/StyleProxy";
import { TrackEvent } from "./TrackEvent";
export declare class TrackObject<ModelType extends TrackModel = TrackModel, TileLoaderType extends TileLoader<any, any> = TileLoader<any, any>> extends Rect {
    protected readonly model: ModelType;
    protected displayLoadingIndicator: boolean;
    protected _pixelRatio: number;
    pixelRatio: number;
    protected dataSource: InternalDataSource;
    protected contig: string | undefined;
    protected x0: number;
    protected x1: number;
    protected defaultCursor: string;
    protected highlightLocation: string;
    protected axisPointers: {
        [id: string]: AxisPointer;
    };
    protected activeAxisPointerColor: number[];
    protected secondaryAxisPointerColor: number[];
    protected highlightPointers: {
        [id: string]: HighlightPointer;
    };
    protected focusRegionRectLeft: Rect;
    protected focusRegionRectRight: Rect;
    protected loadingIndicator: LoadingIndicator;
    protected displayNeedUpdate: boolean;
    protected loadingIndicatorPadding: number;
    constructor(model: ModelType);
    setDataSource(dataSource: InternalDataSource): void;
    setContig(contig: string): void;
    setRange(x0: number, x1: number): void;
    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle): void;
    setHighlightPointer(id: string, fractionX: number, contig?: string): void;
    removeAxisPointer(id: string): void;
    setFocusRegion(x0_fractional: number, x1_fractional: number): void;
    clearFocusRegion(): void;
    private _lastComputedWidth;
    applyTransformToSubNodes(root?: boolean): void;
    currentSamplingDensity(): number;
    applyStyle(styleProxy: StyleProxy): void;
    emitTrackEvent(eventData: TrackEvent): void;
    /**
     * Override to handle drawing
     */
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
    getTileLoader(): TileLoaderType;
    protected _loadingTiles: UsageCache<Tile<any>>;
    protected triggerDisplayUpdate(): void;
    /**
     * Show or hide the loading indicator via animation
     * This function can be safely called repeatedly without accounting for the current state of the indicator
     */
    protected toggleLoadingIndicator(visible: boolean, animate: boolean): void;
    protected createTileLoadingDependency: (tile: Tile<any>) => Tile<any>;
    protected removeTileLoadingDependency: (tile: Tile<any>) => void;
    protected onDependentTileComplete: () => void;
    protected onLoadFailed: () => void;
}
export declare enum AxisPointerStyle {
    Active = 0,
    Secondary = 1
}
export declare class AxisPointer extends Rect {
    activeColor: ArrayLike<number>;
    secondaryColor: ArrayLike<number>;
    readonly style: AxisPointerStyle;
    constructor(style: AxisPointerStyle, activeColor: ArrayLike<number>, secondaryColor: ArrayLike<number>, axis: 'x' | 'y');
    setStyle(style: AxisPointerStyle): void;
}
export declare enum HighlightStyle {
    Active = 0,
    Secondary = 1
}
export declare class HighlightPointer extends Rect {
    activeColor: ArrayLike<number>;
    secondaryColor: ArrayLike<number>;
    readonly style: HighlightStyle;
    constructor(style: HighlightStyle, activeColor: ArrayLike<number>, secondaryColor: ArrayLike<number>, axis: 'x' | 'y');
    setStyle(style: HighlightStyle): void;
}
declare class LoadingIndicator extends Text {
    constructor();
}
export default TrackObject;
