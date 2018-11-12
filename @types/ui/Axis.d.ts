import { UsageCache } from "engine/ds/UsageCache";
import { Renderable } from "engine/rendering/Renderable";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
export declare type AxisAlign = 'top' | 'bottom' | 'left' | 'right';
export declare type AxisConfig = {
    x0: number;
    x1: number;
    align: AxisAlign;
    invert: boolean;
    offset: number;
    snap: number;
    startFrom: number;
    clip: boolean;
    color: ArrayLike<number>;
    fontSizePx: number;
    fontPath: string;
    tickSpacingPx: number;
    maxTextLength: number;
};
export declare class Axis extends Object2D {
    maxTextLength: number;
    fontSizePx: number;
    color: ArrayLike<number>;
    protected _mask: Renderable<any>;
    mask: Renderable<any>;
    minDisplay: number;
    maxDisplay: number;
    protected x0: number;
    protected x1: number;
    protected align: AxisAlign;
    protected invert: boolean;
    protected offset: number;
    protected snap: number;
    protected startFrom: number;
    protected fontPath: string;
    protected tickSpacingPx: number;
    protected clip: boolean;
    protected _color: ArrayLike<number>;
    protected _fontSizePx: number;
    protected _maxTextLength: number;
    protected maxMajorTicks: number;
    protected clippingMask: Rect;
    protected labelCache: UsageCache<Label>;
    protected _labelsNeedUpdate: boolean;
    protected _lastComputedWidth: number;
    protected _lastComputedHeight: number;
    constructor(options?: Partial<AxisConfig>);
    setRange(x0: number, x1: number): void;
    applyTransformToSubNodes(root?: boolean): void;
    releaseGPUResources(): void;
    protected resetLabels(): void;
    protected updateLabels(): void;
    protected touchLabel(x: number, alpha: number, span: number, yMode: boolean): void;
    protected createLabel: (str: string) => Label;
    protected deleteLabel: (label: Label) => void;
    protected isYMode(): boolean;
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
}
declare class Label extends Object2D {
    text: Text;
    tick: Rect;
    constructor(fontPath: string, string: string, fontSizePx: number, align: AxisAlign);
    setColor(r: number, g: number, b: number, a: number): void;
    setMask(mask: Renderable<any>): void;
    releaseGPUResources(): void;
}
export default Axis;
