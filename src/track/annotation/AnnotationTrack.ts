import Animator from "../../Animator";
import UsageCache from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { BlendMode, DrawContext } from "engine/rendering/Renderer";
import InteractionEvent from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { Strand } from "genomics-formats/lib/gff3/Strand";
import { OpenSansRegular } from "../../ui/font/Fonts";
import IntervalInstances, { IntervalInstance } from "../../ui/util/IntervalInstances";
import { TileState } from "../TileLoader";
import TrackObject from "../TrackObject";
import { AnnotationTileLoader, Gene, MacroAnnotationTileLoader, Transcript } from "./AnnotationTileLoader";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from './AnnotationTrackModel';
import { GeneClass, GenomeFeature, TranscriptClass } from "./AnnotationTypes";

const TRANSCRIPT_HEIGHT = 20;

export class AnnotationTrack extends TrackObject<AnnotationTrackModel, AnnotationTileLoader> {

    protected readonly macroLodBlendRange = 2;
    protected readonly macroLodThresholdLow = 7;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected readonly namesLodBlendRange = 2;
    protected readonly namesLodThresholdLow = 7;
    protected readonly namesLodThresholdHigh = this.namesLodThresholdLow + this.namesLodBlendRange;

    protected macroModel: MacroAnnotationTrackModel;

    protected pointerState: TrackPointerState = {
        pointerOver: false,
    }

    constructor(model: AnnotationTrackModel) {
        super(model);

        this.macroModel = {
            ...model,
            type: 'macro-annotation'
        };

        this.color.set([0.1, 0.1, 0.1, 1]);

        this.addInteractionListener('pointerenter', (e) => {
            this.pointerState.pointerOver = true;
        });

        this.addInteractionListener('pointerleave', (e) => {
            this.pointerState.pointerOver = false;
        });
    }

    protected _macroTileCache = new UsageCache<IntervalInstances>();
    protected _annotationCache = new UsageCache<{gene: GeneAnnotation, name: Text}>();
    protected _onStageAnnotations = new UsageCache<Object2D>();
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

        this._onStageAnnotations.removeUnused(this.removeAnnotation);
    }

    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, continuousLodLevel: number, opacity: number) {
        this._annotationCache.markAllUnused();

        let namesOpacity = 1.0 - Scalar.linstep(this.namesLodThresholdLow, this.namesLodThresholdHigh, continuousLodLevel);

        const compact = this.model.compact === true;

        this.getTileLoader().forEachTile(x0, x1, samplingDensity, true, (tile) => {
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

                let annotation = this._annotationCache.get(annotationKey, () => {
                    // create gene object
                    let geneAnnotation = new GeneAnnotation(compact, gene, this.pointerState, this.onAnnotationClicked);
                    geneAnnotation.z = 1 / 4;
                    geneAnnotation.relativeH = 0;

                    if (compact) {
                        geneAnnotation.y = gene.strand === Strand.Positive ? -15 : 15;
                        geneAnnotation.relativeY = 0.5;
                        geneAnnotation.originY = -0.5;
                    } else {
                        geneAnnotation.y = 40;
                    }

                    geneAnnotation.mask = this;
                    geneAnnotation.forEachSubNode((sub) => sub.mask = this);

                    // create name text
                    let name = new Text(OpenSansRegular, gene.name, compact ? 11 : 16, [1, 1, 1, 1]);
                    name.mask = this;
                    name.y = geneAnnotation.y;
                    name.relativeY = geneAnnotation.relativeY;
                    name.z = 5.0;

                    if (compact) {
                        name.originY = -0.5;
                    } else {
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

        this._annotationCache.removeUnused(this.deleteAnnotation);
    }

    protected updateMacroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number) {
        (this.dataSource.getTileLoader(this.macroModel, this.contig) as MacroAnnotationTileLoader).forEachTile(x0, x1, samplingDensity, true, (tile) => {
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
                let nonCodingColor = [82 / 0xff, 75 / 0xff, 165 / 0xff, 0.4];
                let codingColor = [26 / 0xff, 174 / 0xff, 222 / 0xff, 0.4];
                const yPadding = 5;

                for (let gene of tile.payload) {
                    if (this.model.strand != null && gene.strand !== this.model.strand) continue;

                    let color = gene.class === GeneClass.NonProteinCoding ? nonCodingColor : codingColor;

                    if (this.model.compact === true) {
                        instanceData.push({
                            x: 0,
                            y: (gene.strand === Strand.Positive ? -15 : 15) - TRANSCRIPT_HEIGHT * 0.5,
                            z: 0,
                            w: 0,
                            h: TRANSCRIPT_HEIGHT,

                            relativeX: (gene.startIndex - tile.x) / tile.span,
                            relativeY: 0.5,

                            relativeW: gene.length / tile.span,
                            relativeH: 0.0,

                            color: color,
                        });
                    } else {
                        let height = gene.transcriptCount * 20 + (gene.transcriptCount - 1) * 10 + 60;
                        instanceData.push({
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 0,
                            h: height,

                            relativeX: (gene.startIndex - tile.x) / tile.span,
                            relativeY: 0,

                            relativeW: gene.length / tile.span,
                            relativeH: 0,

                            color: color,
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
        // override this to handle annotation interactions
    }

}

type TrackPointerState = {
    pointerOver: boolean,
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
        readonly gene: Gene,
        trackPointerState: TrackPointerState,
        onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => void
    ) {
        super();

        const transcriptOffset = 5;
        const transcriptSpacing = 10;
        this.h = compact ? TRANSCRIPT_HEIGHT : 0;

        if (gene.transcripts.length > 0) {
            for (let i = 0; i < gene.transcripts.length; i++) {
                let transcript = gene.transcripts[i];

                let transcriptAnnotation = new TranscriptAnnotation(transcript, gene.strand, trackPointerState, (e, f) => onAnnotationClicked(e, f, gene));
                transcriptAnnotation.h = TRANSCRIPT_HEIGHT;

                transcriptAnnotation.y = compact ? 0 : i * (TRANSCRIPT_HEIGHT + transcriptSpacing) + transcriptOffset;

                transcriptAnnotation.relativeX = (transcript.startIndex - gene.startIndex) / gene.length;
                transcriptAnnotation.relativeW = transcript.length / gene.length;

                this.add(transcriptAnnotation);
            }
        } else {
            // no transcripts provided, just mark the gene's span
            let spanMarker = new TranscriptSpan(gene.strand);
            spanMarker.color.set([138 / 0xFF, 136 / 0xFF, 191 / 0xFF, 0.38]);
            spanMarker.h = 10;
            spanMarker.relativeW = 1;
            spanMarker.originY = -0.5;
            spanMarker.relativeY = 0.5;
            spanMarker.z = 0.1;
            spanMarker.transparent = true;
            this.add(spanMarker);
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
        protected readonly transcript: Transcript, strand: Strand,
        trackPointerState: TrackPointerState,
        onClick: (e: InteractionEvent, feature: GenomeFeature) => void,
    ) {
        super();

        let transcriptColor = {
            [TranscriptClass.Unspecified]: [0.5, 0.5, 0.5, 0.25],
            [TranscriptClass.ProteinCoding]: [1, 0, 1, 0.25],
            [TranscriptClass.NonProteinCoding]: [0, 1, 1, 0.25],
        }

        let backgroundColor = [107 / 0xff, 109 / 0xff, 136 / 0xff, 0.17]; // rgba(107, 109, 136, 0.17)
        let passiveOpacity = backgroundColor[3];
        let hoverOpacity = passiveOpacity * 3;

        let background = new Rect(0, 0, backgroundColor);
        background.cursorStyle = 'pointer';
        background.z = 0;
        background.transparent = true;
        background.relativeW = 1;
        background.relativeH = 1;

        this.add(background);

        // highlight on mouse-over
        const springStrength = 300;
        background.addInteractionListener('pointermove', (e) => {
            if (trackPointerState.pointerOver) {
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
            if (trackPointerState.pointerOver && e.isPrimary) {
                e.preventDefault();
                e.stopPropagation();
                onClick(e, transcript);
            }
        });

        /**/
        let spanMarker = new TranscriptSpan(strand);
        spanMarker.color.set([138 / 0xFF, 136 / 0xFF, 191 / 0xFF, 0.38]);
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
            let exon = new Exon();
            exon.z = 0.25;
            exon.relativeH = 1;
            exon.relativeX = (exonInfo.startIndex - transcript.startIndex) / transcript.length;
            exon.relativeW = exonInfo.length / transcript.length;
            this.add(exon);
        }

        // create untranslated regions
        for (let utrInfo of transcript.utr) {
            let utr = new UTR();
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

            let cds = new CDS(cdsInfo.length, cdsInfo.phase, strand, mRnaIndex);

            cds.z = 0.75;
            cds.relativeH = 1;
            cds.relativeX = (cdsInfo.startIndex - transcript.startIndex) / transcript.length;
            cds.relativeW = cdsInfo.length / transcript.length;
            this.add(cds);

            mRnaIndex += cdsInfo.length;
        }

    }

}

class Exon extends Rect {

    constructor() {
        super(0, 0);
        this.color.set([82 / 0xff, 75 / 0xff, 165 / 0xff, 0.3]); // rgba(82, 75, 165, 0.3)
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

class UTR extends Rect {

    constructor() {
        super(0, 0);
        this.color.set([138/0xff, 136/0xff, 191/0xff, 0.38]); // rgba(138, 136, 191, 0.38)
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

class CDS extends Rect {

    protected reverse: number;
    protected phase: number;

    constructor(
        protected length_bases: number,
        phase: number, // number of bases to substract from start to reach first complete codon
        strand: Strand,
        mRnaIndex: number,
    ) {
        super(0, 0);
        this.phase = phase;

        let defaultStartTone = phase > 0 ? 1 : 0;

        // we determine which 'tone' the first codon is by its position in the mRNA sequence (after splicing)
        let startTone = Math.floor(mRnaIndex / 3) % 2; // 0 = A, 1 = B

        // if necessary swap start tone by offsetting phase
        if (defaultStartTone !== startTone) {
            this.phase += 3;
        }

        this.reverse = strand === Strand.Negative ? 1.0 : 0.0;

        this.color.set([26 / 0xff, 174 / 0xff, 222 / 0xff, 0.58]); // rgba(26, 174, 222, 0.58)
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

    constructor(protected direction: Strand) {
        super(0, 0);

        this.color.set([0, 1, 0, 1]);
    }

    draw(context: DrawContext) {
        context.uniform2f('pixelSize', 1/context.viewport.w, 1/context.viewport.h);
        context.uniform1f('reverse', this.direction === Strand.Negative ? 1 : 0);
        super.draw(context);
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 pixelSize;
            uniform vec2 size;
            uniform float reverse;

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

            void main() {
                vec2 x = vec2(vUv.x, vUv.y - 0.5);

                x.x = mix(x.x, 1.0 - x.x, reverse);

                float n = 2.0;
                x *= n; x.x = fract(x.x);

                vec2 p = x * size;

                float m = 1.0 - (
                    // arrow
                    lineSegment(
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
                    ) *

                    // middle line
                    lineSegment(x, vec2(0), vec2(1.0, 0.), 0.1, pixelSize)
                );

                vec3 rgb = color.rgb * m;
                float a = m * color.a;

                gl_FragColor = vec4(rgb, 1.0) * a; return;


                /*

                float h = 0.1;
                float l = lineSegment(
                    uv,
                    vec2(0.5 - w * 0.5,  0.5),
                    vec2(0.5 + w * 0.5,  0.5),
                    h,
                    pixelSize
                );

                gl_FragColor = vec4(0., 0., l, 1.); return;

                float r = size.x / size.y;

                vec2 x = vec2(vUv.x, vUv.y - 0.5);
                x.x *= r;
                x *= 1.0; x.x = fract(x.x);

                vec2 lx = vec2(x.x - 0.5, x.y);
                float lines = 1.0 - (
                    lineSegment(lx, vec2(-0.25,  0.25), vec2(0), 0.05, pixelSize) *
                    lineSegment(lx, vec2(-0.25, -0.25), vec2(0), 0.05, pixelSize)
                );

                // gl_FragColor = vec4(lx, 0., 1.); return;

                gl_FragColor = vec4(vec3(lines), 1.);
                */
            }
        `;
    }

}

export default AnnotationTrack;