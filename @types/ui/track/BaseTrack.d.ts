import UsageCache from "engine/ds/UsageCache";
import { Tile } from "../../tile-store/TileStore";
import { TrackModel, TrackTypeMap } from "../../model/TrackModel";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
export declare class TrackObject<ModelType extends keyof TrackTypeMap = keyof TrackTypeMap> extends Rect {
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
export declare enum AxisPointerStyle {
    Active = 0,
    Secondary = 1
}
declare class AxisPointer extends Rect {
    readonly activeColor: ArrayLike<number>;
    readonly secondaryColor: ArrayLike<number>;
    readonly style: AxisPointerStyle;
    constructor(style: AxisPointerStyle, activeColor: ArrayLike<number>, secondaryColor: ArrayLike<number>);
    setStyle(style: AxisPointerStyle): void;
}
declare class LoadingIndicator extends Text {
    constructor();
}
export default TrackObject;
