import { Animator } from "engine/animation/Animator";
import UsageCache from "engine/ds/UsageCache";
import Scalar from "engine/math/Scalar";
import { SharedTileStore } from "../../model/data-store/SharedTileStores";
import { TileState } from "../../model/data-store/TileStore";
import { VariantTileStore } from "../../model/data-store/VariantTileStore";
import { TrackModel } from "../../model/TrackModel";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import { Text } from "engine/ui/Text";
import { OpenSansRegular } from "../font/Fonts";
import TrackObject from "./BaseTrack";
import IntervalInstances, { IntervalInstance } from "./util/IntervalInstances";
import TextClone from "./util/TextClone";
import { EntityType } from "sirius/EntityType";

export default class VariantTrack extends TrackObject<'variant'> {

    protected readonly macroLodBlendRange = 1;
    protected readonly macroLodThresholdLow = 8;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected tileStore: VariantTileStore;
    protected pointerOverTrack = false;

    constructor(model: TrackModel<'variant'>) {
        super(model);

        this.addInteractionListener('pointerenter', (e) => {
            this.pointerOverTrack = true;
        });

        this.addInteractionListener('pointerleave', (e) => {
            this.pointerOverTrack = false;
        });
    }

    setContig(contig: string) {
        let typeKey = this.model.type + ':' + JSON.stringify(this.model.query);
        this.tileStore = SharedTileStore.getTileStore(
            typeKey,
            contig,
            (c) => new VariantTileStore(this.model, contig)
        )
        super.setContig(contig);
    }

    protected _microTileCache = new UsageCache<IntervalInstances>();
    protected _onStageAnnotations = new UsageCache<Object2D>();
    protected _sequenceLabelCache = new UsageCache<{
        root: Object2D, textParent: Object2D, text: TextClone,
    }>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStageAnnotations.markAllUnused();
        this._sequenceLabelCache.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();
        if (widthPx > 0) {

            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            // when query is provided, show micro-view at all scales
            if (this.model.query) {
                microOpacity = 1;
                macroOpacity = 0;
            }

            // micro-scale details
            if (microOpacity > 0) {
                this.tileStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                    if (tile.state !== TileState.Complete) {
                        this._pendingTiles.get(tile.key, () => this.createTileLoadingDependency(tile));
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

                    // @! very suboptimal: draw each character individually; should be using a batch text object
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
                                    let layoutParentX = ((startIndex + i) - x0) / span;

                                    // skip text outside visible range
                                    if ((layoutParentX + baseLayoutW) < 0 || layoutParentX > 1) {
                                        continue;
                                    }

                                    this.displayLabel(
                                        variant.id,
                                        baseCharacter,
                                        color,
                                        startIndex,
                                        altIndex,
                                        i,
                                        layoutParentX,
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
                                let layoutParentX = ((startIndex + 0) - x0) / span;

                                // skip text outside visible range
                                if ((layoutParentX + baseLayoutW) < 0 || layoutParentX > 1) {
                                    continue;
                                }

                                this.displayLabel(
                                    variant.id,
                                    null,
                                    color,
                                    startIndex,
                                    altIndex,
                                    0,
                                    layoutParentX,
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
                                    xFractional: fractionX,
                                    y: altIndex * altHeightPx,
                                    z: 0,
                                    wFractional: altSpan / tile.span,
                                    h: altHeightPx,
                                    color: color,
                                });

                                altIndex++;
                            }

                            // no alts were drawn so there's no handle to click, create an empty one to make them clickable
                            if (altIndex === 0) {
                                instanceData.push({
                                    xFractional: fractionX,
                                    y: 0,
                                    z: 0,
                                    wFractional: refSpan / tile.span,
                                    h: altHeightPx,
                                    color: [1, 0, 0, 0.5],
                                });
                            }

                            // draw line to show reference span
                            instanceData.push({
                                xFractional: fractionX,
                                y: -5,
                                z: 0,
                                wFractional: refSpan / tile.span,
                                h: 2,
                                color: color.slice(0, 3).concat([1]),
                            });
                        }

                        let instancesTile = new IntervalInstances(instanceData);
                        instancesTile.minWidth = 1.0;
                        instancesTile.blendFactor = 0.0; // full additive blending
                        instancesTile.y = tileY;
                        instancesTile.z = 0.75;
                        instancesTile.mask = this;

                        return instancesTile;
                    });

                    tileObject.layoutParentX = (tile.x - x0) / span;
                    tileObject.layoutW = tile.span / span;
                    tileObject.opacity = microOpacity;

                    this._onStageAnnotations.get('micro-tile:' + this.contig + ':' + tile.key, () => {
                        this.add(tileObject);
                        return tileObject;
                    });
                });
            }

        }

        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this._onStageAnnotations.removeUnused((t) => this.remove(t));
        this._sequenceLabelCache.removeUnused(this.deleteBaseLabel);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
        this.displayNeedUpdate = false;
    }

    protected displayLabel(
        variantId: string,
        baseCharacter: string,
        color: ArrayLike<number>,
        startIndex: number,
        altIndex: number,
        charIndex: number,

        layoutParentX: number,
        baseLayoutW: number,

        altHeightPx: number,
        textSizePx: number,
        textOpacity: number,
        tileY: number,
    ) {

        let cacheKey = this.contig + ':' + startIndex + ',' + altIndex + ',' + charIndex;
        let label = this._sequenceLabelCache.get(cacheKey, () => {
            return this.createBaseLabel(baseCharacter, color, () => {
                const entity = {id: variantId, type: EntityType.SNP}
                console.log('@! todo: variant label clicked', entity);
            });
        });

        label.root.layoutParentX = layoutParentX;
        label.root.layoutW = baseLayoutW;
        label.root.y = altIndex * altHeightPx + tileY;
        label.root.h = altHeightPx;

        label.textParent.sx = label.textParent.sy = textSizePx;

        if (label.text != null) {
            label.text.color[3] = textOpacity;
        }
    }

    protected createBaseLabel = (baseCharacter: string, color: ArrayLike<number>, onClick: () => void) => {
        let root = new Rect(0, 0, color);
        root.blendFactor = 0;
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
                onClick();
            }
        });

        // add a 0-sized element centered in the root
        // this is used to position the text
        let textParent = new Object2D();
        textParent.z = 0;
        textParent.layoutParentX = 0.5;
        textParent.layoutParentY = 0.5;

        let textClone: TextClone = null;

        // create textClone
        if (baseCharacter !== null) {
            let textInstance = VariantTrack.baseTextInstances[baseCharacter];
            if (textInstance === undefined) {
                textInstance = VariantTrack.baseTextInstances['?'];
            }

            let textClone = new TextClone(textInstance, [1, 1, 1, 1]);
            textClone.additiveBlendFactor = 1.0;
            textClone.layoutX = -0.5;
            textClone.layoutY = -0.5;
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

    // we only need 1 text instance of each letter which we can render multiple times
    // this saves reallocating new vertex buffers for each letter
    // this is a stop-gap solution before something like batching or instancing
    protected static baseTextInstances: { [key: string]: Text } = {
        'A': new Text(OpenSansRegular, 'A', 1, [1, 1, 1, 1]),
        'C': new Text(OpenSansRegular, 'C', 1, [1, 1, 1, 1]),
        'G': new Text(OpenSansRegular, 'G', 1, [1, 1, 1, 1]),
        'T': new Text(OpenSansRegular, 'T', 1, [1, 1, 1, 1]),
        '?': new Text(OpenSansRegular, '?', 1, [1, 1, 1, 1]),
    }

}