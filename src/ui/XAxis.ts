import { UsageCache } from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { Renderable } from "engine/rendering/Renderable";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { OpenSansRegular } from "./font";

export class XAxis extends Object2D {

    maxMajorTicks: number = 10000; // failsafe to avoid rendering hangs in case of bugs

    set maxTextLength(v: number) {
        if (v !== this._maxTextLength) this.labelsNeedUpdate();
        this._maxTextLength = v;
    }

    get maxTextLength() {
        return this._maxTextLength;
    }

    set fontSizePx(v: number) {
        if (v !== this._fontSizePx) this.labelsNeedUpdate();
        this._fontSizePx = v;
    }
    get fontSizePx() {
        return this._fontSizePx;
    }

    set color(v: ArrayLike<number>) {
        this._color = v;
        this.labelsNeedUpdate();
    }

    get color() {
        return this._color;
    }

    minDisplay: number = -Infinity;
    maxDisplay: number = Infinity;

    protected x0: number = 0;
    protected x1: number = 1;
    
    protected _color: ArrayLike<number>;
    protected _fontSizePx: number;
    protected _maxTextLength: number = 4;

    protected _labelsNeedUpdate: boolean;
    protected _lastComputedWidth: number;

    protected clippingMask: Rect;

    protected labelCache = new UsageCache<Label>();

    constructor(
        x0: number = 0,
        x1: number = 1,
        color: ArrayLike<number> = [0, 0, 0],
        fontSizePx: number = 16,
        protected fontPath: string = OpenSansRegular,
        protected offset: number = 0,
        protected snap: number = 1,
        protected startFrom: number = 0,
        protected tickSpacingPx: number = 50,
    ) {
        super();
        this.render = false;
        this.x0 = x0;
        this.x1 = x1;
        this._color = color;
        this._fontSizePx = fontSizePx;
        this._labelsNeedUpdate = true;

        // default size
        this.h = fontSizePx * 2;
        this.w = 200;

        this.clippingMask = new Rect(0, 0, [0.9, 0.9, 0.9, 1]);
        this.clippingMask.layoutW = 1;
        this.clippingMask.layoutH = 1;
        this.clippingMask.visible = false;
        this.add(this.clippingMask);
    }

    setRange(x0: number, x1: number) {
        this._labelsNeedUpdate = this._labelsNeedUpdate || this.x0 !== x0 || this.x1 !== x1;
        this.x0 = x0;
        this.x1 = x1;
    }

    // override applyTreeTransforms to call updateLabels so that it's applied when world-space layouts are known
    applyTransformToSubNodes(root?: boolean) {
        this._labelsNeedUpdate = this._labelsNeedUpdate || this.computedWidth !== this._lastComputedWidth;

        if (this._labelsNeedUpdate) {
            this.updateLabels();
            this._lastComputedWidth = this.computedWidth;
        }

        super.applyTransformToSubNodes(root);
    }

    protected labelsNeedUpdate() {
        this.labelCache.removeAll(this.deleteLabel);
        this._labelsNeedUpdate = true;
    }

    protected updateLabels() {
        this.labelCache.markAllUnused();

        // guard case where we cannot display anything
        let span = this.x1 - this.x0;
        if (span === 0) {
            this.labelCache.removeUnused(this.deleteLabel);
            return;
        }

        const tickSpacingPx = this.tickSpacingPx * 2;
        const rangeWidthPx = this.computedWidth;
        const tickRatio = tickSpacingPx / rangeWidthPx;
        const snap = this.snap;

        // we're dealing in absolute space too much
        // we should convert to absolute space only when displaying text

        // let t0x = tickRatio * range; // x-space location of first tick after 0

        let n = Scalar.log2(tickRatio * span / snap);

        let lMajor = Math.ceil(n);
        let lMinor = Math.floor(n);
        let a = (n - lMinor); // current mix between lMinor and lMajor

        let transitionSharpness = 5; // from 0 to Infinity
        let minorAlpha = Math.pow((1 - a), transitionSharpness); // exponent is used to sharpen the transition

        let xMajorSpacing = (snap * Math.pow(2, lMajor)); // cannot use bitwise arithmetic because we're limited to 32 bits in js
        let xMinorSpacing = (snap * Math.pow(2, lMinor)) * 2;

        let firstDisplayTick = Math.floor(this.x0 / xMajorSpacing);
        let lastDisplayTick = Math.ceil(this.x1 / xMajorSpacing);

        let ticksRemaining = this.maxMajorTicks;
        for (let i = firstDisplayTick; i <= lastDisplayTick && ticksRemaining > 0; i++) {
            ticksRemaining--;

            let xMinor = xMinorSpacing * (i + 0.5);
            let xMajor = xMajorSpacing * i;

            if (xMinor >= this.minDisplay && xMinor <= this.maxDisplay && isFinite(xMinor)) {
                let minorParentX = (xMinor - this.x0 + this.offset) / span;
                let str = XAxis.formatValue(xMinor + this.startFrom, this._maxTextLength);
                let textMinor = this.labelCache.get(xMinor + '_' + str, () => this.createLabel(str));
                textMinor.layoutParentX = minorParentX;
                let c = this._color;
                textMinor.setColor(c[0], c[1], c[2], minorAlpha);
                textMinor.opacity = minorAlpha;
            }

            if (xMajor >= this.minDisplay && xMajor <= this.maxDisplay && isFinite(xMajor)) {
                let majorParentX = (xMajor - this.x0 + this.offset) / span;
                let str = XAxis.formatValue(xMajor + this.startFrom, this._maxTextLength);
                let textMajor = this.labelCache.get(xMajor + '_' + str, () => this.createLabel(str));
                textMajor.layoutParentX = majorParentX;
                let c = this._color;
                textMajor.setColor(c[0], c[1], c[2], 1);
            }
        }

        this.labelCache.removeUnused(this.deleteLabel);
        this._labelsNeedUpdate = false;
    }

    protected createLabel = (str: string) => {
        let label = new Label(this.fontPath, str, this.fontSizePx);
        label.layoutParentY = 1;
        label.z = 0.1;
        label.setMask(this.clippingMask);
        this.add(label);
        return label;
    }

    protected deleteLabel = (label: Label) => {
        label.releaseGPUResources();
        this.remove(label);
    }

    /**
     * Convert a number to a fixed point representation by truncating instead of rounding
     * 
     * For example:
     *  - `toFixedTrunc(999.996, 2) => "999.99"`
     *  - `toFixedTrunc(999.996, 5) => "999.99600"`
     *  - `toFixedTrunc(999.996, 0) => "999"`
     */
    static toFixedTrunc(x: number, decimalPoints: number): string {
        let str = x.toString();
        let pattern = /([\d+-]+)(\.(\d*))?(.*)/;
        let result = pattern.exec(str);

        // if it doesn't match a number pattern then return the .toString() result
        // this catches cases such as Infinity or NaN
        if (result == null) {
            return str;
        }

        // extract pattern parts
        let integerPart = result[1];
        let fractionalPart = result[3];
        let trailingCharacters = result[4];

        // truncate fractional part to show just 'decimalPoints' numbers
        let fractionString = (fractionalPart || '').substring(0, decimalPoints);

        // right-pad with 0s
        for (let i = fractionString.length; i < decimalPoints; i++) {
            fractionString += '0';
        }

        // recompose number
        return integerPart + (fractionString.length > 0 ? '.' + fractionString : '') + trailingCharacters;
    }

    static siPrefixes: { [key: string]: string } = {
        '8': 'Y', // yotta
        '7': 'Z', // zetta
        '6': 'E', // exa
        '5': 'P', // peta
        '4': 'T', // tera
        '3': 'G', // giga
        '2': 'M', // mega
        '1': 'k', // kilo
        '-1': 'm', // milli
        '-2': 'µ', // micro
        '-3': 'n', // nano
        '-4': 'p', // pico
        '-5': 'f', // femto
        '-6': 'a', // atto
        '-7': 'z', // zepto
        '-8': 'y', // yocto
    };

    public static formatValue(x: number, maxLength: number) {
        let str = x.toString();
    
        if (str.length > maxLength) {
            // if default print of string is too long, try to reduce it with a exponent symbol
            let exp10 = Scalar.log10(Math.abs(x));
            let expSign = Scalar.sign(exp10);
            let exp1000Int = Math.floor(Math.abs(exp10 / 3)) * expSign;
    
            let symbol = XAxis.siPrefixes[exp1000Int.toFixed(0)];
            let reductionFactor = Math.pow(1000, exp1000Int);
    
            if (symbol === undefined) {
                let exp10Int = Math.floor(Math.abs(exp10)) * expSign;
                symbol = exp10Int <= 3 ? '' : 'e' + exp10Int.toFixed(0);
            }
    
            let reducedX = x / reductionFactor;
            let reducedXIntStr = Math.floor(reducedX).toFixed(0);
            let dp = maxLength - reducedXIntStr.length - symbol.length - 1;
    
            let numString = XAxis.toFixedTrunc(reducedX, Math.max(dp, 0));
    
            str = numString + symbol;
        }
    
        return str;
    }

}

class Label extends Object2D {

    text: Text;
    tick: Rect;

    constructor(fontPath: string, string: string, fontSizePx: number) {
        super();
        let tickHeightPx = 5;
        let tickWidthPx = 1;

        this.text = new Text(fontPath, string, fontSizePx);
        this.text.layoutX = -0.5;
        this.text.layoutY = -1;
        this.text.y = -tickHeightPx - 3;
        this.add(this.text);

        this.tick = new Rect(tickWidthPx, tickHeightPx);
        this.tick.layoutX = -0.5;
        this.tick.layoutY = -1;
        this.tick.transparent = true;
        this.add(this.tick);

        this.render = false;
        this.setColor(0, 0, 0, 1);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.text.color.set([r, g, b, a]);
        this.tick.color.set([r, g, b, a * 0.5]);
    }

    setMask(mask: Renderable<any>) {
        this.text.mask = mask;
        this.tick.mask = mask;
    }

    releaseGPUResources() {
        this.text.releaseGPUResources();
        this.tick.releaseGPUResources();
    }

}

export default XAxis;