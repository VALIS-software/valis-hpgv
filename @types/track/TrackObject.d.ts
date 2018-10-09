import UsageCache from "engine/ds/UsageCache";
import { Tile, TileCache } from "./TileCache";
import { TrackModel } from "./TrackModel";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { InternalDataSource } from "../data-source/InternalDataSource";
export declare class TrackObject<ModelType extends TrackModel = TrackModel, TileCacheType extends TileCache<any, any> = TileCache<any, any>> extends Rect {
    protected readonly model: ModelType;
    protected readonly tileDataKey?: string;
    protected dataSource: InternalDataSource;
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
    constructor(model: ModelType, tileDataKey?: string);
    setDataSource(dataSource: InternalDataSource): void;
    setContig(contig: string): void;
    setRange(x0: number, x1: number): void;
    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle): void;
    removeAxisPointer(id: string): void;
    setFocusRegion(x0_fractional: number, x1_fractional: number): void;
    clearFocusRegion(): void;
    private _lastComputedWidth;
    applyTransformToSubNodes(root?: boolean): void;
    protected getTileCache(): TileCacheType;
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
