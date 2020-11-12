import { UsageCache } from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { Renderable } from "engine/rendering/Renderable";
import Object2D from "engine/ui/Object2D";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { MadaRegular } from "./font";

export type AxisAlign = 'top' | 'bottom' | 'left' | 'right';

export type AxisConfig = {
    x0: number,
    x1: number,

    align: AxisAlign,

    invert: boolean,

    offset: number,
    snap: number,
    startFrom: number,

    clip: boolean,
    color: ArrayLike<number>,
    fontSizePx: number,
    fontPath: string,
    tickSpacingPx: number,
    maxTextLength: number,
    tickSizePx: number,
    tickOffsetPx: number,
}

export class Axis extends Object2D {

    set maxTextLength(v: number) {
        if (v !== this._maxTextLength) this.resetLabels();
        this._maxTextLength = v;
    }

    get maxTextLength() {
        return this._maxTextLength;
    }

    set fontSizePx(v: number) {
        if (v !== this._fontSizePx) this.resetLabels();
        this._fontSizePx = v;
    }
    get fontSizePx() {
        return this._fontSizePx;
    }

    set color(v: ArrayLike<number>) {
        this._color = v;
        this._labelsNeedUpdate = true;
    }

    get color() {
        return this._color;
    }
    
    protected _mask: Renderable<any>;
    set mask(v: Renderable<any>) {
        this._mask = v;
        this.resetLabels();
    }

    get mask() {
        return this._mask;
    }

    minDisplay: number = -Infinity;
    maxDisplay: number = Infinity;

    protected x0: number;
    protected x1: number;
    protected align: AxisAlign;
    protected invert: boolean;
    protected offset: number;
    protected snap: number;
    protected startFrom: number;

    protected fontPath: string;
    protected tickSpacingPx: number;
    protected tickSizePx: number;
    protected tickOffsetPx: number;
    
    protected clip: boolean;
    protected _color: ArrayLike<number>;
    protected _fontSizePx: number;
    protected _maxTextLength: number;

    protected maxMajorTicks: number = 10000; // failsafe to avoid rendering hangs in case of bugs

    protected clippingMask: Rect;

    protected labelCache = new UsageCache<Label>(
        null,
        (label) => this.deleteLabel(label),
    );

    protected _labelsNeedUpdate: boolean;
    protected _lastComputedWidth: number;
    protected _lastComputedHeight: number;

    constructor(
        options?: Partial<AxisConfig>
    ) {
        super();

        // default style & user style
        let config: AxisConfig = {
            x0: 0,
            x1: 1,
            align: 'top',
            invert: false,
            offset: 0,
            snap: 1,
            startFrom: 0,
            clip: false,
            color: [0, 0, 0],
            fontSizePx: 16,
            fontPath: MadaRegular,
            tickSpacingPx: 30,
            maxTextLength: 4,
            tickSizePx: 5,
            tickOffsetPx: 3,

            ...options,
        };

        this.render = false;
        this.x0 = config.x0;
        this.x1 = config.x1;
        this.align = config.align;
        this.invert = config.invert;
        this.offset = config.offset;
        this.snap = config.snap;
        this.startFrom = config.startFrom;
        this.clip = config.clip;
        this._color = config.color;
        this._fontSizePx = config.fontSizePx;
        this.fontPath = config.fontPath;
        this.tickSpacingPx = config.tickSpacingPx;
        this._maxTextLength = config.maxTextLength;
        this.tickSizePx = config.tickSizePx;
        this.tickOffsetPx = config.tickOffsetPx;

        this._labelsNeedUpdate = true;

        // default size
        if (this.isYMode()) {
            this.w = this.fontSizePx * 2;
            this.h = 200;
        } else {
            this.w = 200;
            this.h = this.fontSizePx * 2;
        }

        if (this.clip) {
            this.clippingMask = new Rect(0, 0, [0.9, 0.9, 0.9, 1]);
            this.clippingMask.relativeW = 1;
            this.clippingMask.relativeH = 1;
            this.clippingMask.visible = false;
            this.add(this.clippingMask);
        }
    }

    setRange(x0: number, x1: number) {
        this._labelsNeedUpdate = this._labelsNeedUpdate || (this.x0 !== x0) || (this.x1 !== x1);
        this.x0 = x0;
        this.x1 = x1;
    }

    // override applyTreeTransforms to call updateLabels so that it's applied when world-space layouts are known
    applyTransformToSubNodes(root?: boolean) {
        // mark labels need update if dimensions change
        if (!this._labelsNeedUpdate) {
            if (this.isYMode()) {
                this._labelsNeedUpdate = this.computedHeight !== this._lastComputedHeight;
            } else {
                this._labelsNeedUpdate = this.computedWidth !== this._lastComputedWidth;
            }
        }

        if (this._labelsNeedUpdate) {
            this.updateLabels();
            this._lastComputedWidth = this.computedWidth;
            this._lastComputedHeight = this.computedHeight;
        }

        super.applyTransformToSubNodes(root);
    }

    releaseGPUResources() {
        this.resetLabels();
    }

    protected resetLabels() {
        if (this.labelCache === undefined) return;

        this.labelCache.removeAll();
        this._labelsNeedUpdate = true;
    }

    protected updateLabels() {
        this.labelCache.markAllUnused();

        // guard case where we cannot display anything
        let span = this.x1 - this.x0;
        if (span === 0) {
            this.labelCache.removeUnused();
            return;
        }

        let yMode: boolean = this.isYMode();

        const rangeWidthPx = yMode ? this.computedHeight : this.computedWidth;
        const tickRatio = (this.tickSpacingPx * 2) / rangeWidthPx;
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

            this.touchLabel(xMinor, minorAlpha, span, yMode);
            this.touchLabel(xMajor, 1, span, yMode);
        }

        this.labelCache.removeUnused();
        this._labelsNeedUpdate = false;
    }

    protected touchLabel(x: number, alpha: number, span: number, yMode: boolean) {
        if ((x >= this.minDisplay) && (x <= this.maxDisplay) && isFinite(x)) {
            let parentX = (x - this.x0 + this.offset) / span;

            let display = this.clip ? true : (parentX >= 0 && parentX <= 1);

            if (display) {
                if (this.invert) {
                    parentX = 1 - parentX;
                }

                let str = Axis.formatValue(x + this.startFrom, this._maxTextLength);
                let textMinor = this.labelCache.get(x + '_' + str, () => this.createLabel(str));

                let c = this._color;
                textMinor.setColor(c[0], c[1], c[2], alpha);
                textMinor.opacity = alpha;

                if (yMode) {
                    textMinor.relativeY = parentX;
                } else {
                    textMinor.relativeX = parentX;
                }
            }
        }
    }

    protected createLabel = (str: string) => {
        let label = new Label(this.fontPath, str, this.fontSizePx, this.align, this.tickSizePx, this.tickOffsetPx);
        switch (this.align) {
            case 'top': 
                label.relativeY = 0;
                break;
            case 'bottom':
                label.relativeY = 1;
                break;
            case 'left':
                label.relativeX = 0;
                break;
            case 'right':
                label.relativeX = 1;
                break;
        }
        label.z = 0.1;
        label.setMask(this.clippingMask || this._mask);
        this.add(label);
        return label;
    }

    protected deleteLabel = (label: Label) => {
        label.releaseGPUResources();
        this.remove(label);
    }

    protected isYMode() {
        return (this.align === 'left') || (this.align === 'right');
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
        '-2': 'μ', // micro
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
    
            let symbol = Axis.siPrefixes[exp1000Int.toFixed(0)];
            let reductionFactor = Math.pow(1000, exp1000Int);
    
            if (symbol === undefined) {
                let exp10Int = Math.floor(Math.abs(exp10)) * expSign;
                symbol = exp10Int <= 3 ? '' : 'e' + exp10Int.toFixed(0);
            }
    
            let reducedX = x / reductionFactor;
            let reducedXIntStr = Math.floor(reducedX).toFixed(0);
            let dp = maxLength - reducedXIntStr.length - symbol.length - 1;
    
            let numString = Axis.toFixedTrunc(reducedX, Math.max(dp, 0));
    
            str = numString + symbol;
        }

        return str;
    }

}

class Label extends Object2D {

    text: Text;
    tick: Rect;

    constructor(fontPath: string, string: string, fontSizePx: number, align: AxisAlign, tickSizePx: number, tickOffsetPx: number) {
        super();
        let tickWidthPx = 1;

        this.text = new Text(fontPath, string, fontSizePx);

        switch (align) {
            case 'top': {
                this.tick = new Rect(tickWidthPx, tickSizePx);
                this.tick.originX = -0.5;
                this.tick.originY = 0;
                this.text.originX = -0.5;
                this.text.originY = 0;
                this.text.y = tickSizePx + tickOffsetPx;
                break;
            }
            case 'bottom': {
                this.tick = new Rect(tickWidthPx, tickSizePx);
                this.tick.originX = -0.5;
                this.tick.originY = -1;
                this.text.originX = -0.5;
                this.text.originY = -1;
                this.text.y = -tickSizePx - tickOffsetPx;
                break;
            }
            case 'left': {
                this.tick = new Rect(tickSizePx, tickWidthPx);
                this.tick.originX = 0;
                this.tick.originY = -0.5;
                this.text.originX = 0;
                this.text.originY = -0.5;
                this.text.x = tickSizePx + tickOffsetPx;
                break;
            }
            case 'right': {
                this.tick = new Rect(tickSizePx, tickWidthPx);
                this.tick.originX = -1;
                this.tick.originY = -0.5;
                this.text.originX = -1;
                this.text.originY = -0.5;
                this.text.x = -tickSizePx - tickOffsetPx;
                break;
            }
        }

        this.add(this.text);
        this.tick.transparent = true;
        this.add(this.tick);

        this.render = false;
        this.setColor(0, 0, 0, 1);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.text.color = [r, g, b, a];
        this.tick.color = [r, g, b, a * 0.5];
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

export default Axis;