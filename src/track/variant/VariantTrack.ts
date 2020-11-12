import Animator from "../../Animator";
import UsageCache from "engine/ds/UsageCache";
import Scalar from "engine/math/Scalar";
import InteractionEvent from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import { Text } from "engine/ui/Text";
import { MadaRegular } from "../../ui/font/Fonts";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import TextClone from "../../ui/util/TextClone";
import { TileState } from "../TileLoader";
import TrackObject from "../TrackObject";
import { VariantTileLoader } from "./VariantTileLoader";
import { VariantTrackModel } from "./VariantTrackModel";

export class VariantTrack<Model extends VariantTrackModel = VariantTrackModel> extends TrackObject<Model, VariantTileLoader> {

    protected readonly macroLodBlendRange = 1;
    protected readonly macroLodThresholdLow = 8;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected pointerOverTrack = false;

    constructor(model: Model) {
        super(model);

        this.addInteractionListener('pointerenter', (e) => {
            this.pointerOverTrack = true;
        });

        this.addInteractionListener('pointerleave', (e) => {
            this.pointerOverTrack = false;
        });
    }

    // @! this needs clearing
    protected _microTileCache = new UsageCache<IntervalInstances>(
        null,
        (instances) => instances.releaseGPUResources(),
    );
    protected _onStageAnnotations = new UsageCache<Object2D>(
        null,
        (t) => this.remove(t),
    );
    protected _sequenceLabelCache = new UsageCache<{root: Object2D, textParent: Object2D, text: TextClone,}>(
        null,
        (label) => this.deleteBaseLabel(label)
    );
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        this._onStageAnnotations.markAllUnused();
        this._sequenceLabelCache.markAllUnused();

        if (widthPx > 0) {
            let tileLoader = this.getTileLoader();

            let basePairsPerDOMPixel = (span / widthPx);

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            // when query is provided, show micro-view at all scales
            if (this.model.query) {
                microOpacity = 1;
                macroOpacity = 0;
            }

            // micro-scale details
            if (microOpacity > 0) {
                tileLoader.forEachTile(this.x0, this.x1, basePairsPerDOMPixel, true, (tile) => {
                    if (tile.state !== TileState.Complete) {
                        return;
                    }

                    const altHeightPx = 25;
                    const tileY = 15;

                    const baseLayoutW = 1 / span;
                    const baseDisplayWidth = widthPx * baseLayoutW;

                    const maxTextSize = 16;
                    const minTextSize = 1;
                    const padding = 1;
                    const maxOpacity = 1.0;
                    const textSizePx = Math.min(baseDisplayWidth - padding, maxTextSize);
                    let textOpacity = Math.min(Math.max((textSizePx - minTextSize) / (maxTextSize - minTextSize), 0.0), 1.0) * maxOpacity;
                    textOpacity = textOpacity * textOpacity;

                    // suboptimal: draw each character individually; would be faster be using a batch text object
                    // display text
                    if (textOpacity > 0 && textSizePx > 0) {
                        for (let variant of tile.payload) {
                            let startIndex = variant.baseIndex;

                            let altIndex = 0;
                            let refSpan = variant.refSequence.length;

                            let color: Array<number> = [1, 0, 0, 1.0]; // default to deletion

                            for (let altSequence of variant.alts) {
                                let altSpan = altSequence.length;

                                let lengthDelta = altSpan - refSpan;

                                // generate color from lengthDelta
                                let opacity = 1;
                                if (lengthDelta === 0) {
                                    color = [1.0, 1.0, 1.0, opacity];
                                } else if (lengthDelta < 0) {
                                    color = [1.0, 0.3, 0.5, opacity];
                                } else {
                                    color = [0.3, 1.0, 0.5, opacity];
                                }

                                for (let i = 0; i < altSpan; i++) {
                                    let baseCharacter = altSequence[i];
                                    let relativeX = ((startIndex + i) - this.x0) / span;

                                    // skip text outside visible range
                                    if ((relativeX + baseLayoutW) < 0 || relativeX > 1) {
                                        continue;
                                    }

                                    this.displayLabel(
                                        variant.id,
                                        baseCharacter,
                                        color,
                                        startIndex,
                                        altIndex,
                                        i,
                                        relativeX,
                                        baseLayoutW,
                                        altHeightPx,
                                        textSizePx,
                                        textOpacity,
                                        tileY
                                    );
                                }

                                altIndex++;
                            }

                            // no alts were drawn so there's no handle to click, create an empty one to make them clickable
                            if (altIndex === 0) {
                                let relativeX = ((startIndex + 0) - this.x0) / span;

                                // skip text outside visible range
                                if ((relativeX + baseLayoutW) < 0 || relativeX > 1) {
                                    continue;
                                }

                                this.displayLabel(
                                    variant.id,
                                    null,
                                    color,
                                    startIndex,
                                    altIndex,
                                    0,
                                    relativeX,
                                    baseLayoutW,
                                    altHeightPx,
                                    textSizePx,
                                    textOpacity,
                                    tileY
                                );
                            }
                        }
                    }

                    let tileObject = this._microTileCache.get(this.contig + ':' + tile.key, () => {
                        let instanceData = new Array<IntervalInstance>();

                        // GC -> G = deletion of G
                        // C -> A,TT = replace A, insert TT
                        // ATCCTG -> A { A: 0.005591 }
                        // GCCGCCC -> GCCGCCCCCGCCC, G, GCCGCCCCCGCCCCCGCCC {GCCGCCCCCGCCC: 0.031, G: 0.00009917, GCCGCCCCCGCCCCCGCCC: 0.00006611}

                        for (let variant of tile.payload) {
                            let fractionX = (variant.baseIndex - tile.x) / tile.span;

                            // multiple boxes
                            let refSpan = variant.refSequence.length;

                            let color: Array<number> = [1, 0, 0, 1.0]; // default to deletion

                            let altIndex = 0;
                            for (let altSequence of variant.alts) {
                                let altSpan = altSequence.length;

                                let lengthDelta = altSpan - refSpan;

                                // generate color from lengthDelta
                                let opacity = 0.7;
                                if (lengthDelta === 0) {
                                    color = [0.8, 0.8, 0.8, opacity];
                                } else if (lengthDelta < 0) {
                                    color = [1, 0, 0, opacity];
                                } else {
                                    color = [0, 1, 0, opacity];
                                }

                                instanceData.push({
                                    x: 0,
                                    y: altIndex * altHeightPx,
                                    z: 0,
                                    w: 0,
                                    h: altHeightPx,

                                    relativeX: fractionX,
                                    relativeY: 0,
                                    relativeW: altSpan / tile.span,
                                    relativeH: 0,

                                    color: color,
                                });

                                altIndex++;
                            }

                            // no alts were drawn so there's no handle to click, create an empty one to make them clickable
                            if (altIndex === 0) {
                                instanceData.push({
                                    x: 0,
                                    y: 0,
                                    z: 0,
                                    w: 0,
                                    h: altHeightPx,

                                    relativeX: fractionX,
                                    relativeY: 0,
                                    relativeW: refSpan / tile.span,
                                    relativeH: 0,

                                    color: [1, 0, 0, 0.5],
                                });
                            }

                            // draw line to show reference span
                            instanceData.push({
                                x: 0,
                                y: -5,
                                z: 0,
                                w: 0,
                                h: 2,

                                relativeX: fractionX,
                                relativeY: 0,
                                relativeW: refSpan / tile.span,
                                relativeH: 0,

                                color: color.slice(0, 3).concat([1]),
                            });
                        }

                        let instancesTile = new IntervalInstances(instanceData);
                        instancesTile.minWidth = 1.0;
                        instancesTile.additiveBlending = 1.0; // full additive blending
                        instancesTile.y = tileY;
                        instancesTile.z = 0.75;
                        instancesTile.mask = this;

                        return instancesTile;
                    });

                    tileObject.relativeX = (tile.x - this.x0) / span;
                    tileObject.relativeW = tile.span / span;
                    tileObject.opacity = microOpacity;

                    this._onStageAnnotations.get('micro-tile:' + this.contig + ':' + tile.key, () => {
                        this.add(tileObject);
                        return tileObject;
                    });
                });
            }

        }

        this._onStageAnnotations.removeUnused();
        this._sequenceLabelCache.removeUnused();
        this._microTileCache.removeUnused();
    }

    protected displayLabel(
        variantId: string,
        baseCharacter: string,
        color: Array<number>,
        startIndex: number,
        altIndex: number,
        charIndex: number,

        relativeX: number,
        baseLayoutW: number,

        altHeightPx: number,
        textSizePx: number,
        textOpacity: number,
        tileY: number,
    ) {

        let cacheKey = this.contig + ':' + startIndex + ',' + altIndex + ',' + charIndex;
        let label = this._sequenceLabelCache.get(cacheKey, () => {
            return this.createBaseLabel(baseCharacter, color, (e) => this.onVariantClicked(e, variantId));
        });

        label.root.relativeX = relativeX;
        label.root.relativeW = baseLayoutW;
        label.root.y = altIndex * altHeightPx + tileY;
        label.root.h = altHeightPx;

        label.textParent.sx = label.textParent.sy = textSizePx;
    }

    protected createBaseLabel = (baseCharacter: string, color: ArrayLike<number>, onClick: (e: InteractionEvent) => void) => {
        let root = new Rect(0, 0, color);
        root.additiveBlending = 1;
        root.mask = this;
        root.opacity = 0;
        root.z = 0.5;

        // highlight on mouse-over
        const springStrength = 250;
        root.addInteractionListener('pointermove', (e) => {
            if (this.pointerOverTrack) {
                root.cursorStyle = 'pointer';
                Animator.springTo(root, {opacity: 0.6}, springStrength);
            } else {
                root.cursorStyle = null;
                Animator.springTo(root, { opacity: 0 }, springStrength);
            }
        });
        root.addInteractionListener('pointerleave', () => {
            root.cursorStyle = null;
            Animator.springTo(root, { opacity: 0 }, springStrength);
        });

        // callback on click
        root.addInteractionListener('pointerup', (e) => {
            if (this.pointerOverTrack && e.isPrimary) {
                e.preventDefault();
                e.stopPropagation();
                onClick(e);
            }
        });

        // add a 0-sized element centered in the root
        // this is used to position the text
        let textParent = new Object2D();
        textParent.z = 0;
        textParent.relativeX = 0.5;
        textParent.relativeY = 0.5;

        let textClone: TextClone = null;

        // create textClone
        if (baseCharacter !== null) {
            let textInstance = VariantTrack.baseTextInstances[baseCharacter];
            if (textInstance === undefined) {
                textInstance = VariantTrack.baseTextInstances['?'];
            }

            let textClone = new TextClone(textInstance, [1, 1, 1, 1]);
            textClone.additiveBlending = 1.0;
            textClone.originX = -0.5;
            textClone.originY = -0.5;
            textClone.mask = this;

            textParent.add(textClone);
            root.add(textParent);
        }


        this.add(root);

        return { root: root, textParent: textParent, text: textClone };
    }

    protected deleteBaseLabel = (label: { root: Object2D, textParent: Object2D, text: TextClone }) => {
        if (label.text != null) {
            label.textParent.remove(label.text); // ensure textClone cleanup is fired
            label.text.releaseGPUResources();
        }
        this.remove(label.root);
    }

    protected onVariantClicked = (e: InteractionEvent, variantId: string) => {}

    // we only need 1 text instance of each letter which we can render multiple times
    // this saves reallocating new vertex buffers for each letter
    // this is a stop-gap solution before something like batching or instancing
    protected static baseTextInstances: { [key: string]: Text } = {
        'A': new Text(MadaRegular, 'A', 1, [1, 1, 1, 1]),
        'C': new Text(MadaRegular, 'C', 1, [1, 1, 1, 1]),
        'G': new Text(MadaRegular, 'G', 1, [1, 1, 1, 1]),
        'T': new Text(MadaRegular, 'T', 1, [1, 1, 1, 1]),
        '?': new Text(MadaRegular, '?', 1, [1, 1, 1, 1]),
    }

}

export default VariantTrack;