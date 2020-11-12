import * as React from "react";

import Animator from "../../Animator";
import UsageCache from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { BlendMode, DrawContext } from "engine/rendering/Renderer";
import InteractionEvent from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { Strand } from "genomics-formats/lib/gff3/Strand";
import { MadaRegular } from "../../ui/font/Fonts";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { TileState } from "../TileLoader";
import TrackObject from "../TrackObject";
import { AnnotationTileLoader, Gene, Transcript } from "./AnnotationTileLoader";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from './AnnotationTrackModel';
import { GeneClass, GenomeFeature, TranscriptClass, GenomeFeatureType, TranscriptComponentInfo } from "./AnnotationTypes";
import { StyleProxy } from "../../ui/util/StyleProxy";
import { CSSUtil } from "../../ui/util/CSSUtil";

const TRANSCRIPT_HEIGHT = 20;

export class AnnotationTrack extends TrackObject<AnnotationTrackModel, AnnotationTileLoader> {

    static getDefaultHeightPx(model: any) {
        return 120;
    };

    static getExpandable(model: AnnotationTrackModel) {
        let defaultCompact = true;
        let compact = model.compact != null ? model.compact : defaultCompact;
        return compact ? false : true;
    }

    protected readonly macroLodBlendRange = 2;
    protected readonly macroLodThresholdLow = 7;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected readonly namesLodBlendRange = 1;
    protected readonly namesLodThresholdLow = 6;
    protected readonly namesLodThresholdHigh = this.namesLodThresholdLow + this.namesLodBlendRange;

    protected readonly annotationY = {
        [Strand.Positive]: -20,
        [Strand.Negative]:  20,
        [Strand.Unknown]:  0,
        [Strand.None]:  0,
    };

    protected macroModel: MacroAnnotationTrackModel;

    readonly compact: boolean;

    readonly displayLabels: boolean;

    protected colors = {
        '--transcript-arrow': [138 / 0xff, 136 /0xff, 191 /0xff, 0.38],
        '--transcript': [107 / 0xff, 109 / 0xff, 136 / 0xff, 0.17],
        '--coding': [26 / 0xff, 174 / 0xff, 222 / 0xff, 0.4],
        '--non-coding': [82 / 0xff, 75 / 0xff, 165 / 0xff, 0.4],
        '--coding-max-score': [26 / 0xff, 174 / 0xff, 222 / 0xff, 0.4],
        '--non-coding-max-score': [82 / 0xff, 75 / 0xff, 165 / 0xff, 0.4],
        '--untranslated': [138 / 0xff, 136 / 0xff, 191 / 0xff, 0.38],
        'color': [1, 1, 1, 1],
        '--stroke': [1, 1, 1, 1],
    }

    protected sharedState = {
        colors: this.colors,
        style: {
            // 'font-size': 16,
            '--stroke-width': 1,
        },
        pointerOver: false,
    }

    protected debugOptions = {
        showTileBoundaries: false
    }

    constructor(model: AnnotationTrackModel) {
        super(model);

        this.compact = this.model.compact !== false;
        this.displayLabels = this.model.displayLabels;

        this.macroModel = {
            ...model,
            type: 'macro-annotation'
        };

        this.addInteractionListener('pointerenter', (e) => {
            this.sharedState.pointerOver = true;
        });

        this.addInteractionListener('pointerleave', (e) => {
            this.sharedState.pointerOver = false;
        });
    }

    applyStyle(styleProxy: StyleProxy) {
        super.applyStyle(styleProxy);

        // clear caches
        this._macroTileCache.removeAll();
        this._annotationCache.removeAll();
        this._onStageAnnotations.removeAll();
        this.displayNeedUpdate = true;

        for (let propertyName in this.colors) {
            let color = styleProxy.getColor(propertyName);
            if (color != null) {
                (this.colors as {[key: string]: Array<number>})[propertyName] = color;
            }
        }

        for (let propertyName in this.sharedState.style) {
            let num = styleProxy.getNumber(propertyName);
            if (num !== null) {
                (this.sharedState.style as { [key: string]: number })[propertyName] = num;
            }
        }
    }

    protected _macroTileCache = new UsageCache<IntervalInstances>(null, (instances) => instances.releaseGPUResources());
    protected _annotationCache = new UsageCache<{gene: GeneAnnotation, name: Text}>(null, (annotation) => this.deleteAnnotation(annotation));
    protected _onStageAnnotations = new UsageCache<Object2D>(null, (node) => this.removeAnnotation(node));
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        this._onStageAnnotations.markAllUnused();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            if (microOpacity > 0) {
                this.updateMicroAnnotations(this.x0, this.x1, span, basePairsPerDOMPixel, continuousLodLevel, microOpacity);
            }

            if (macroOpacity > 0) {
                this.updateMacroAnnotations(this.x0, this.x1, span, basePairsPerDOMPixel, macroOpacity);
            }
        }

        this._onStageAnnotations.removeUnused();
    }

    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, continuousLodLevel: number, opacity: number) {
        this._annotationCache.markAllUnused();

        let namesOpacity = 1.0 - Scalar.linstep(this.namesLodThresholdLow, this.namesLodThresholdHigh, continuousLodLevel);
        if (!this.displayLabels) {
            namesOpacity = 0;
        }

        let microSamplingDensity = 1;

        this.getTileLoader().forEachTile(x0, x1, microSamplingDensity, true, (tile) => {
            // debug: draw red lines at tile boundaries
            if (this.debugOptions.showTileBoundaries) {
                let tileBoundaryKey = tile.key + ':boundary';
                let tileBoundary = this._onStageAnnotations.get(tileBoundaryKey, () => {
                    let tileBoundary = new Rect(2, 0, [1, 0, 0, 1]);
                    tileBoundary.relativeH = 1;
                    this.add(tileBoundary);
                    return tileBoundary;
                });
                tileBoundary.relativeX = (tile.x - x0) / span;
            }

            if (tile.state !== TileState.Complete) {
                return;
            }

            for (let gene of tile.payload) {
                // @! temp performance hack, only use node when visible
                // (don't need to do this when using instancing)
                { if (!(gene.startIndex <= x1 && (gene.startIndex + gene.length) >= x0)) continue; }

                // apply gene filter
                if (this.model.strand != null && gene.strand !== this.model.strand) continue;

                let annotationKey = this.contig + ':' + this.annotationKey(gene);

                this.colors['--transcript'] =  CSSUtil.getBedFileRGBA(gene.color, gene.score);

                let annotation = this._annotationCache.get(annotationKey, () => {
                    // create gene object
                    let geneAnnotation = new GeneAnnotation(this.compact, this.displayLabels, gene, this.sharedState, this.onAnnotationClicked);
                    geneAnnotation.z = 1 / 4;
                    geneAnnotation.relativeH = 0;

                    if (this.compact) {
                        geneAnnotation.y = this.annotationY[gene.strand || Strand.Unknown];
                        geneAnnotation.relativeY = 0.5;
                        geneAnnotation.originY = -0.5;
                    } else {
                        geneAnnotation.y = 40;
                    }

                    geneAnnotation.mask = this;
                    geneAnnotation.forEachSubNode((sub) => sub.mask = this);

                    // create name text
                    let name = new Text(MadaRegular, gene.name == null ? '' : gene.name, this.compact ? 11 : 16, this.colors['color']);
                    // name.fontSizePx = this.sharedState.style['font-size'];
                    name.strokeEnabled = (this.colors['--stroke'][3] > 0) && (this.sharedState.style['--stroke-width'] > 9);
                    name.strokeColor = this.colors['--stroke'];
                    name.strokeWidthPx = this.sharedState.style['--stroke-width'];
                    name.mask = this;
                    name.y = geneAnnotation.y;
                    name.relativeY = geneAnnotation.relativeY;
                    name.z = 5.0;

                    if (this.compact) {
                        // name.originY = -0.5;
                        name.y = geneAnnotation.y;
                        name.relativeY = geneAnnotation.relativeY;
                        name.originY = -1.75;
                    } else {
                        name.y = geneAnnotation.y;
                        name.relativeY = geneAnnotation.relativeY;
                        name.originY = -1;
                    }

                    return {gene: geneAnnotation, name: name};
                });


                annotation.gene.relativeW = (gene.length) / span;
                annotation.gene.relativeX = (gene.startIndex - x0) / span;
                annotation.gene.opacity = opacity;

                annotation.name.visible = namesOpacity > 0;
                annotation.name.opacity = namesOpacity;
                annotation.name.x = 5
                annotation.name.relativeX = Math.max(annotation.gene.relativeX, 0);

                // add to the scene graph (auto removed when unused)
                this._onStageAnnotations.get(annotationKey, () => {
                    this.add(annotation.gene);
                    return annotation.gene;
                });

                this._onStageAnnotations.get(annotationKey + ':name', () => {
                    this.add(annotation.name);
                    return annotation.name;
                });
            }
        });

        // layout text
        // @! needs work.
        /*
        annotations.sort((a, b) => {
            return a.gene.relativeX - b.gene.relativeX;
        });

        let trackWidth = this.getComputedWidth();

        let cursorPositiveX = 0;
        let cursorNegativeX = 0;
        for (let annotation of annotations) {
            let cursorX = annotation.gene.gene.strand === Strand.Positive ? cursorPositiveX : cursorNegativeX;
            // annotation.name.x = 5
            annotation.name.relativeX = annotation.gene.relativeX;

            if (annotation.name.relativeX < cursorX) {
                annotation.name.relativeX = cursorX;
                if (annotation.name.relativeX > (annotation.gene.relativeX + annotation.gene.relativeW)) {
                    annotation.name.visible = false;
                }
            }

            cursorX = annotation.name.relativeX + annotation.name.getComputedWidth() / trackWidth;

            if (annotation.gene.gene.strand === Strand.Positive) {
                cursorPositiveX = cursorX;
            } else {
                cursorNegativeX = cursorX;
            }
        }
        */

        this._annotationCache.removeUnused();
    }

    protected updateMacroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number) {
        let tileLoader = this.getTileLoader();
        let macroSamplingDensity = 1 << tileLoader.macroLod;
        tileLoader.forEachTile(x0, x1, macroSamplingDensity, true, (tile) => {
            // debug: draw green lines at tile boundaries
            if (this.debugOptions.showTileBoundaries) {
                let tileBoundaryKey = tile.key + ':boundary';
                let tileBoundary = this._onStageAnnotations.get(tileBoundaryKey, () => {
                    let tileBoundary = new Rect(2, 0, [0, 1, 0, 1]);
                    tileBoundary.relativeH = 1;
                    this.add(tileBoundary);
                    return tileBoundary;
                });
                tileBoundary.relativeX = (tile.x - x0) / span;
            }

            if (tile.state !== TileState.Complete) {
                // if the tile is incomplete then wait until complete and call updateAnnotations() again
                this._loadingTiles.get(this.contig + ':' + tile.key, () => this.createTileLoadingDependency(tile));
                return;
            }

            // Instance Rendering
            let tileObject = this._macroTileCache.get(this.contig + ':' + tile.key, () => {
                // initialize macro gene instances
                // create array of gene annotation data
                let instanceData = new Array<IntervalInstance>();
                const yPadding = 5;

                for (let gene of tile.payload) {
                    if (this.model.strand != null && gene.strand !== this.model.strand) continue;

                    let color = gene.class === GeneClass.NonProteinCoding ? this.colors['--non-coding'] : this.colors['--coding'];

                    // apply shading based on score
                    if (gene.score != null && gene.score > 0) {
                        let maxScoreColor = gene.class === GeneClass.NonProteinCoding ? this.colors['--non-coding-max-score'] : this.colors['--coding-max-score'];
                        color = rgbaLerp(color, maxScoreColor, Math.max(0, Math.min(1, gene.score / 1000)));
                    }

                    let colorLowerAlpha = color.slice();
                    colorLowerAlpha[3] *= .689655172;

                    if (this.compact) {
                        instanceData.push({
                            x: 0,
                            y: (this.annotationY[gene.strand || Strand.Unknown]) - TRANSCRIPT_HEIGHT * 0.5,
                            z: 0,
                            w: 1,
                            h: TRANSCRIPT_HEIGHT,

                            relativeX: (gene.startIndex - tile.x) / tile.span,
                            relativeY: 0.5,

                            relativeW: gene.length / tile.span,
                            relativeH: 0.0,

                            color: colorLowerAlpha,
                        });
                    } else {
                        let height = gene.transcriptCount * 20 + (gene.transcriptCount - 1) * 10 + 60;
                        instanceData.push({
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                            h: height,

                            relativeX: (gene.startIndex - tile.x) / tile.span,
                            relativeY: 0,

                            relativeW: gene.length / tile.span,
                            relativeH: 0,

                            color: colorLowerAlpha,
                        });
                    }

                }

                let geneInstances = new IntervalInstances(instanceData);
                geneInstances.y = 0;
                geneInstances.z = 0.75;
                geneInstances.relativeH = 1;
                geneInstances.mask = this;
                return geneInstances;
            });

            tileObject.relativeX = (tile.x - x0) / span;
            tileObject.relativeW = tile.span / span;
            tileObject.opacity = opacity;

            this._onStageAnnotations.get('macro-gene-tile:' + this.contig + ':' + tile.key, () => {
                this.addAnnotation(tileObject);
                return tileObject;
            });
        });
    }

    protected addAnnotation = (annotation: Object2D) => {
        this.add(annotation);
    }

    protected removeAnnotation = (annotation: Object2D) => {
        this.remove(annotation);
    }

    protected deleteAnnotation = (annotation: {gene: Object2D, name: Text}) => {
        annotation.gene.releaseGPUResources();
        annotation.gene.forEachSubNode((sub) => {
            sub.releaseGPUResources();
        });
        annotation.name.releaseGPUResources();
    }

    protected annotationKey = (feature: {
        soClass: string | number,
        name?: string,
        startIndex: number,
        length: number,
    }) => {
        return feature.soClass + '\x1F' + feature.name + '\x1F' + feature.startIndex + '\x1F' + feature.length;
    }

    protected onAnnotationClicked = (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => {
        this.emitTrackEvent({
            ...e,
            type: 'annotation-clicked',
            trackObject: this,
            feature: feature,
            gene: gene,
        });
    }

}

function rgbaLerp(colorA: Array<number>, colorB:Array<number>, t: number) {
    let result = new Array(4);

    result[0] = (colorB[0] - colorA[0]) * t + colorA[0];
    result[1] = (colorB[1] - colorA[1]) * t + colorA[1];
    result[2] = (colorB[2] - colorA[2]) * t + colorA[2];
    result[3] = (colorB[3] - colorA[3]) * t + colorA[3];

    return result;
}

class GeneAnnotation extends Object2D {

    set opacity(v: number) {
        this._opacity = v;
        for (let child of this.children) {
            child.opacity = v;
        }
    }
    get opacity() {
        return this._opacity;
    }

    // protected name: Text;
    protected _opacity: number = 1;

    constructor(
        readonly compact: boolean,
        readonly displayLabels: boolean,
        readonly gene: Gene,
        sharedState: AnnotationTrack['sharedState'],
        onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => void
    ) {
        super();

        const transcriptOffset = 5;
        const transcriptSpacing = 10;
        this.h = compact ? TRANSCRIPT_HEIGHT : 0;

        if (gene.transcripts.length > 0) {
            for (let i = 0; i < gene.transcripts.length; i++) {
                let transcript = gene.transcripts[i];

                let transcriptAnnotation = new TranscriptAnnotation(sharedState, transcript, gene.strand, (e, f) => onAnnotationClicked(e, f, gene));
                transcriptAnnotation.h = TRANSCRIPT_HEIGHT;

                transcriptAnnotation.y = compact ? 0 : i * (TRANSCRIPT_HEIGHT + transcriptSpacing) + transcriptOffset;

                transcriptAnnotation.relativeX = (transcript.startIndex - gene.startIndex) / gene.length;
                transcriptAnnotation.relativeW = transcript.length / gene.length;

                this.add(transcriptAnnotation);
            }
        } else {
            // no transcripts provided, use an empty transcript marker to make the gene visible
            let emptyTranscript: Transcript = {
                type: GenomeFeatureType.Transcript,
                class: TranscriptClass.Unspecified,
                startIndex: gene.startIndex,
                soClass: 'transcript',
                length: gene.length,
                exon: [],
                cds: [],
                utr: [],
                other: [],
            };
            let transcriptAnnotation = new TranscriptAnnotation(sharedState, emptyTranscript, gene.strand, (e, f) => onAnnotationClicked(e, f, gene));
            transcriptAnnotation.h = TRANSCRIPT_HEIGHT;
            transcriptAnnotation.y = 0;
            transcriptAnnotation.relativeW = 1;
            this.add(transcriptAnnotation);
        }
    }

}

class TranscriptAnnotation extends Object2D {

    set opacity(v: number) {
        this._opacity = v;
        for (let child of this.children) {
            child.opacity = v;
        }
    }
    get opacity() {
        return this._opacity;
    }

    protected _opacity: number = 1;

    constructor(
        sharedState: AnnotationTrack['sharedState'],
        protected readonly transcript: Transcript,
        strand: Strand,
        onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature) => void,
    ) {
        super();

        let backgroundColor = sharedState.colors['--transcript'].slice();
        let passiveOpacity = backgroundColor[3];
        let hoverOpacity = passiveOpacity * 3;

        let background = new Rect(0, 0, backgroundColor);
        background.cursorStyle = 'pointer';
        background.z = 0;
        background.transparent = true;
        background.relativeW = 1;
        background.relativeH = 0.75;
        background.relativeY = 0.5;
        background.originY = -0.5;

        this.add(background);

        // highlight on mouse-over
        const springStrength = 300;
        background.addInteractionListener('pointermove', (e) => {
            if (sharedState.pointerOver) {
                background.cursorStyle = 'pointer';
                Animator.springTo(background.color, { 3: hoverOpacity }, springStrength);
            } else {
                background.cursorStyle = null;
                Animator.springTo(background.color, { 3: passiveOpacity }, springStrength);
            }
        });
        background.addInteractionListener('pointerleave', () => {
            background.cursorStyle = null;
            Animator.springTo(background.color, { 3: passiveOpacity }, springStrength);
        });

        // callback on click
        background.addInteractionListener('pointerup', (e) => {
            if (sharedState.pointerOver && e.isPrimary) {
                e.preventDefault();
                e.stopPropagation();
                onAnnotationClicked(e, transcript);
            }
        });

        /**/
        let spanMarker = new TranscriptSpan(sharedState, strand);
        spanMarker.color = sharedState.colors['--transcript-arrow'];
        spanMarker.h = 10;
        spanMarker.relativeW = 1;
        spanMarker.originY = -0.5;
        spanMarker.relativeY = 0.5;
        spanMarker.z = 0.1;
        spanMarker.transparent = true;
        this.add(spanMarker);
        /**/

        // create exons
        for (let exonInfo of transcript.exon) {
            let exon = new Exon(sharedState, exonInfo, onAnnotationClicked);
            exon.z = 0.25;
            exon.relativeH = 1;
            exon.relativeX = (exonInfo.startIndex - transcript.startIndex) / transcript.length;
            exon.relativeW = exonInfo.length / transcript.length;
            this.add(exon);
        }

        // create untranslated regions
        for (let utrInfo of transcript.utr) {
            let utr = new UTR(sharedState, utrInfo, onAnnotationClicked);
            utr.z = 0.5;
            utr.relativeH = 1;
            utr.relativeX = (utrInfo.startIndex - transcript.startIndex) / transcript.length;
            utr.relativeW = utrInfo.length / transcript.length;
            this.add(utr);
        }

        // create protein coding sequences
        // ! assuming CDS array is sorted from startIndex

        let reverse = strand === Strand.Negative;
        let mRnaIndex = 0; // track offset within RNA sequence after splicing
        for (let k = 0; k < transcript.cds.length; k++) {
            // if on negative strand, iterate in reverse
            let i = reverse ? ((transcript.cds.length - 1) - k) : k;

            let cdsInfo = transcript.cds[i];

            let cds = new CDS(sharedState, cdsInfo, onAnnotationClicked, strand, mRnaIndex);

            cds.z = 0.75;
            cds.relativeH = 1;
            cds.relativeX = (cdsInfo.startIndex - transcript.startIndex) / transcript.length;
            cds.relativeW = cdsInfo.length / transcript.length;
            this.add(cds);

            mRnaIndex += cdsInfo.length;
        }

    }

}

class TranscriptComponent extends Rect {

    constructor(sharedState: AnnotationTrack['sharedState'], info: TranscriptComponentInfo, onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature) => void) {
        super(0, 0);

        this.addInteractionListener('pointerup', (e) => {
            if (sharedState.pointerOver && e.isPrimary) {
                e.preventDefault();
                e.stopPropagation();
                onAnnotationClicked(e, info);
            }
        });

        let hoverOverlay = new Rect(0, 0, [1, 1, 1, 1]);
        hoverOverlay.relativeW = 1;
        hoverOverlay.relativeH = 1;
        hoverOverlay.opacity = 0;
        this.add(hoverOverlay);

        // highlight on mouse-over
        const springStrength = 300;
        this.addInteractionListener('pointerenter', (e) => {
            // e.stopPropagation();
            this.cursorStyle = 'pointer';
            Animator.springTo(hoverOverlay, { opacity: 0.1 }, springStrength);
        });
        this.addInteractionListener('pointerleave', () => {
            this.cursorStyle = null;
            Animator.springTo(hoverOverlay, { opacity: 0 }, springStrength);
        });
    }

}

class Exon extends TranscriptComponent {

    constructor(sharedState: AnnotationTrack['sharedState'], info: TranscriptComponentInfo, onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature) => void) {
        super(sharedState, info, onAnnotationClicked);
        this.color = sharedState.colors['--non-coding'];
        this.transparent = true;
    }

    draw(context: DrawContext) {
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;

            uniform vec4 color;

            varying vec2 vUv;

            void main() {
                vec2 domPx = vUv * size;

                const vec2 borderWidthPx = vec2(1.);
                const float borderStrength = 0.3;

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                vec4 c = color;
                c.rgb += (1.0 - border) * vec3(borderStrength);

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class UTR extends TranscriptComponent {

    constructor(sharedState: AnnotationTrack['sharedState'], info: TranscriptComponentInfo, onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature) => void) {
        super(sharedState, info, onAnnotationClicked);
        this.color = sharedState.colors['--untranslated'];
        this.transparent = true;
    }

    draw(context: DrawContext) {
        context.uniform1f('pixelRatio', this.worldTransformMat4[0] * context.viewport.w * 0.5);
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;
            uniform vec4 color;
            uniform float pixelRatio;

            varying vec2 vUv;

            void main() {
                vec2 domPx = vUv * size;

                const vec2 borderWidthPx = vec2(1.);

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                // crosshatch
                const float angle = -0.520;
                const float widthPx = 2.;
                const float wavelengthPx = 7.584;
                const float lineStrength = 0.25;

                vec2 centerPx = domPx - size * 0.5;

                float lPx = centerPx.x * cos(angle) - centerPx.y * sin(angle);
                // not antialiased but looks good enough with current color scheme
                float lines = step(widthPx, mod(lPx, wavelengthPx)) * lineStrength + (1. - lineStrength);

                vec4 c = color;
                c.rgb += (1.0 - border * lines) * vec3(0.3);

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class CDS extends TranscriptComponent {

    protected reverse: number;
    protected phase: number;
    protected length_bases: number;

    constructor(
        sharedState: AnnotationTrack['sharedState'],
        info: TranscriptComponentInfo,
        onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature) => void,

        strand: Strand,
        mRnaIndex: number,
    ) {
        super(sharedState, info, onAnnotationClicked);

        this.length_bases = info.length;
        this.phase = info.phase; // number of bases to substract from start to reach first complete codon

        let defaultStartTone = this.phase > 0 ? 1 : 0;

        // we determine which 'tone' the first codon is by its position in the mRNA sequence (after splicing)
        let startTone = Math.floor(mRnaIndex / 3) % 2; // 0 = A, 1 = B

        // if necessary swap start tone by offsetting phase
        if (defaultStartTone !== startTone) {
            this.phase += 3;
        }

        this.reverse = strand === Strand.Negative ? 1.0 : 0.0;

        this.color = sharedState.colors['--coding']; // rgba(26, 174, 222, 0.58)
        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
    }

    draw(context: DrawContext) {
        context.uniform1f('baseWidthPx', (this.computedWidth / this.length_bases));
        context.uniform1f('phase', this.phase || 0);
        context.uniform1f('reverse', this.reverse);
        context.uniform1f('pixelRatio', this.worldTransformMat4[0] * context.viewport.w * 0.5);
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;

            uniform float pixelRatio;
            uniform float baseWidthPx;
            uniform float phase;
            uniform float reverse;

            uniform vec4 color;

            varying vec2 vUv;

            float squareWaveIntegral(in float x, in float wavelength) {
                float k = x / wavelength;
                float u = fract(k);
                float wave = step(0.5, u) * 2.0 - 1.0;
                return (fract(k * wave) - 1.) * wavelength;
            }

            float squareWaveAntialiased(in float xPixels, in float wavelengthPixels) {
                // antialiasing: we find the average over the pixel by sampling signal integral either side and dividing by sampling interval (1 in this case)
                float waveAvg = squareWaveIntegral(xPixels + 0.5, wavelengthPixels) - squareWaveIntegral(xPixels - 0.5, wavelengthPixels);

                // lerp to midpoint (0) for small wavelengths (~ 1 pixel) to avoid moire patterns
                waveAvg = mix(waveAvg, 0., clamp(2. - wavelengthPixels, 0., 1.0));
                return waveAvg;
            }

            void main() {
                vec2 domPx = vUv * size;

                const vec2 borderWidthPx = vec2(1.);
                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                // two-tones for codons
                vec4 codonAColor = color;
                vec4 codonBColor = color + vec4(0.05);
                // a codon is 3 bases wide
                float codonWidthPx = baseWidthPx * 3.0;

                // use square wave to create codon tones
                // we use true pixel coordinates to make antialiasing easier
                float xPixels = (mix(domPx.x, size.x - domPx.x, reverse) - baseWidthPx * phase) * pixelRatio;
                float wavelengthPixels = codonWidthPx * pixelRatio * 2.0;

                float codon = squareWaveAntialiased(xPixels, wavelengthPixels) * 0.5 + 0.5; // scale wave to 0 - 1

                vec4 c =
                    mix(codonAColor, codonBColor, codon); // switch between codon colors

                c.rgb += (1.0 - border) * vec3(0.3); // additive blend border

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class TranscriptSpan extends Rect {

    // -1 for Strand.Negative
    //  1 for Strand.Positive
    //  0 otherwise
    protected directionNumber: number = 0;

    constructor(sharedState: AnnotationTrack['sharedState'], protected direction: Strand) {
        super(0, 0);

        switch (direction) {
            case Strand.Negative: {
                this.directionNumber = -1;
                break;
            }
            case Strand.Positive: {
                this.directionNumber =  1;
                break;
            }
            default: {
                this.directionNumber =  0;
                break;
            }
        }

        this.color = ([0, 1, 0, 1]);
    }

    draw(context: DrawContext) {
        context.uniform2f('pixelSize', 1/context.viewport.w, 1/context.viewport.h);
        context.uniform1f('direction', (this.directionNumber + 1.0) * 0.5);
        super.draw(context);
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 pixelSize;
            uniform vec2 size;
            uniform float direction; // 0 = negative, 1 = positive, 0.5 = neutral

            uniform vec4 color;

            varying vec2 vUv;

            float distanceToSegment(vec2 a, vec2 b, vec2 p) {
                p -= a; b -= a;                        // go to A referential
                float q = dot(p, b) / dot(b, b) ;      // projection of P on line AB: normalized ordinate
                b *= clamp(q, 0., 1.);                 // point on segment AB closest to P
                return length( p - b);                 // distance to P
            }

            float lineSegment(vec2 x, vec2 a, vec2 b, float r, vec2 pixelSize) {
                float f = distanceToSegment(a, b, x);
                float e = pixelSize.x * 0.5;
                return smoothstep(r - e, r + e, f);
            }

            float arrow(vec2 p) {
                return lineSegment(
                    p + vec2(-size.x * 0.5, 0.0),
                    vec2(-10.0, -10.0) * 0.75,
                    vec2(  0.0,   0.0),
                    1.0,
                    pixelSize
                ) *
                lineSegment(
                    p + vec2(-size.x * 0.5, 0.0),
                    vec2(-10.0, 10.0) * 0.75,
                    vec2(  0.0,  0.0),
                    1.0,
                    pixelSize
                );
            }

            void main() {
                vec2 x = vec2(vUv.x, vUv.y - 0.5);

                x.x = mix(1.0 - x.x, x.x, direction);

                float n = 2.0;
                x *= n; x.x = fract(x.x);

                vec2 p = x * size;

                float m = 1.0 - (
                    // disable arrow if direction = 0.5
                    mix(
                        arrow(p),
                        1.0,
                        step(direction, 0.75) * step(0.25, direction)
                    ) *

                    // middle line
                    lineSegment(x, vec2(0), vec2(1.0, 0.), 0.1, pixelSize)
                );

                vec3 rgb = color.rgb * m;
                float a = m * color.a;

                gl_FragColor = vec4(rgb, 1.0) * a; return;
            }
        `;
    }

}

export default AnnotationTrack;
