import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { Renderable } from "engine/rendering/Renderable";
import { Scalar } from "engine/math/Scalar";
import { UsageCache } from "engine/ds/UsageCache";

export class XAxis extends Object2D {

    maxMajorTicks: number = 10000; // failsafe to avoid rendering hangs in case of bugs

    set maxTextLength(v: number) {
        let change = this._maxTextLength !== v;
        this._maxTextLength = v;
        if (change) {
            this.labelsNeedUpdate = true;
            this.labelCache.removeAll(this.deleteLabel);
        }
    }

    get maxTextLength() {
        return this._maxTextLength;
    }

    set fontSizePx(v: number) {
        this._fontSizePx = v;
        this.labelCache.removeAll(this.deleteLabel);
        this.labelsNeedUpdate = true;
    }
    get fontSizePx() {
        return this._fontSizePx;
    }

    minDisplay: number = -Infinity;
    maxDisplay: number = Infinity;

    protected x0: number = 0;
    protected x1: number = 1;
    protected _fontSizePx: number;
    protected _maxTextLength: number = 4;

    protected labelsNeedUpdate: boolean;
    protected lastComputedWidth: number;

    protected clippingMask: Rect;

    // valid for stable (fontSize, fontPath)
    protected labelCache = new UsageCache<Label>();

    constructor(
        x0: number = 0,
        x1: number = 1,
        fontSizePx: number = 16,
        protected fontPath: string,
        protected offset: number = 0,
        protected snap: number = 1,
        protected startFrom: number = 0,
    ) {
        super();
        this.render = false;
        this.x0 = x0;
        this.x1 = x1;
        this._fontSizePx = fontSizePx;
        this.labelsNeedUpdate = true;

        this.clippingMask = new Rect(0, 0, [0.9, 0.9, 0.9, 1]);
        this.clippingMask.layoutW = 1;
        this.clippingMask.layoutH = 1;
        this.clippingMask.opacity = 0;
        this.add(this.clippingMask);
    }

    setRange(x0: number, x1: number) {
        this.labelsNeedUpdate = this.labelsNeedUpdate || this.x0 !== x0 || this.x1 !== x1;
        this.x0 = x0;
        this.x1 = x1;
    }

    // override applyTreeTransforms to call updateLabels so that it's applied when world-space layouts are known
    applyTransformToSubNodes(root?: boolean) {
        this.labelsNeedUpdate = this.labelsNeedUpdate || this.computedWidth !== this.lastComputedWidth;

        if (this.labelsNeedUpdate) {
            this.updateLabels();
            this.lastComputedWidth = this.computedWidth;
        }

        super.applyTransformToSubNodes(root);
    }

    protected updateLabels() {
        this.labelCache.markAllUnused();

        // guard case where we cannot display anything
        let span = this.x1 - this.x0;
        if (span === 0) {
            this.labelCache.removeUnused(this.deleteLabel);
            return;
        }

        const tickSpacingPx = 80 * 2;
        const rangeWidthPx = this.computedWidth;
        const tickRatio = tickSpacingPx / rangeWidthPx;
        const snap = this.snap;

        // @! problem is we're dealing in absolute space too much
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
                textMinor.setColor(0, 0, 0, minorAlpha);
                textMinor.opacity = minorAlpha;
            }

            if (xMajor >= this.minDisplay && xMajor <= this.maxDisplay && isFinite(xMajor)) {
                let majorParentX = (xMajor - this.x0 + this.offset) / span;
                let str = XAxis.formatValue(xMajor + this.startFrom, this._maxTextLength);
                let textMajor = this.labelCache.get(xMajor + '_' + str, () => this.createLabel(str));
                textMajor.layoutParentX = majorParentX;
                textMajor.setColor(0, 0, 0, 1);
            }
        }

        this.labelCache.removeUnused(this.deleteLabel);
        this.labelsNeedUpdate = false;
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