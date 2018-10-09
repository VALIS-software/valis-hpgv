import { UsageCache } from "engine/ds/UsageCache";
import { Renderable } from "engine/rendering/Renderable";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
export declare class XAxis extends Object2D {
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
}
declare class Label extends Object2D {
    text: Text;
    tick: Rect;
    constructor(fontPath: string, string: string, fontSizePx: number);
    setColor(r: number, g: number, b: number, a: number): void;
    setMask(mask: Renderable<any>): void;
    releaseGPUResources(): void;
}
export default XAxis;
