import { Strand } from "gff3/Strand";
import { GeneClass, TranscriptClass } from "sirius/AnnotationTileset";
import QueryBuilder from "sirius/QueryBuilder";
import Animator from "engine/animation/Animator";
import UsageCache from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import { AnnotationTileStore, Gene, MacroAnnotationTileStore, Transcript } from "../../model/data-store/AnnotationTileStore";
import SharedTileStore from "../../model/data-store/SharedTileStores";
import { TileState } from "../../model/data-store/TileStore";
import TrackModel from "../../model/TrackModel";
import { BlendMode, DrawContext } from "engine/rendering/Renderer";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { OpenSansRegular } from "../font/Fonts";
import TrackObject from "./BaseTrack";
import IntervalInstances, { IntervalInstance } from "./util/IntervalInstances";
import { SiriusApi } from "sirius/SiriusApi";

/**
 * WIP Annotation tracks:
 *
 * Todo:
 * - Convert micro-scale annotations to use instancing (and text batching)
 * - Merge shaders where possible and clean up
 */
export class AnnotationTrack extends TrackObject<'annotation'> {

    protected readonly macroLodBlendRange = 2;
    protected readonly macroLodThresholdLow = 10;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected readonly namesLodBlendRange = 2;
    protected readonly namesLodThresholdLow = 9;
    protected readonly namesLodThresholdHigh = this.namesLodThresholdLow + this.namesLodBlendRange;

    protected annotationStore: AnnotationTileStore;
    protected macroAnnotationStore: AnnotationTileStore;

    protected pointerState: TrackPointerState = {
        pointerOver: false,
    }

    constructor(model: TrackModel<'annotation'>) {
        super(model);

        this.color.set([0.1, 0.1, 0.1, 1]);

        this.addInteractionListener('pointerenter', (e) => {
            this.pointerState.pointerOver = true;
        });

        this.addInteractionListener('pointerleave', (e) => {
            this.pointerState.pointerOver = false;
        });
    }

    setContig(contig: string) {
        this.annotationStore = SharedTileStore.getTileStore(
            'annotation',
            contig,
            (c) => { return new AnnotationTileStore(c); }
        );
        this.macroAnnotationStore = SharedTileStore.getTileStore(
            'macroAnnotation',
            contig,
            (c) => { return new MacroAnnotationTileStore(c); }
        );
        super.setContig(contig);
    }

    protected _macroTileCache = new UsageCache<IntervalInstances>();
    protected _annotationCache = new UsageCache<Object2D>();
    protected _onStageAnnotations = new UsageCache<Object2D>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStageAnnotations.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            if (microOpacity > 0) {
                this.updateMicroAnnotations(x0, x1, span, basePairsPerDOMPixel, continuousLodLevel, microOpacity);
            }

            if (macroOpacity > 0) {
                this.updateMacroAnnotations(x0, x1, span, basePairsPerDOMPixel, macroOpacity);
            }
        }

        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this._onStageAnnotations.removeUnused(this.removeAnnotation);

        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
        this.displayNeedUpdate = false;
    }

    protected updateMacroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number) {
        this.macroAnnotationStore.getTiles(x0, x1, samplingDensity, true, (tile) => {
            if (tile.state !== TileState.Complete) {
                // if the tile is incomplete then wait until complete and call updateAnnotations() again
                this._pendingTiles.get(this.contig + ':' + tile.key, () => this.createTileLoadingDependency(tile));
                return;
            }

            // Instance Rendering
            let tileObject = this._macroTileCache.get(this.contig + ':' + tile.key, () => {
                // initialize macro gene instances
                // create array of gene annotation data
                let instanceData = new Array<IntervalInstance>();
                let nonCodingColor = [82 / 0xff, 75 / 0xff, 165 / 0xff, 0.4];
                let codingColor = [26 / 0xff, 174 / 0xff, 222 / 0xff, 0.4];

                for (let gene of tile.payload) {
                    if (gene.strand !== this.model.strand) continue;

                    let color = gene.class === GeneClass.NonProteinCoding ? nonCodingColor : codingColor;
                    let height = gene.transcriptCount * 20 + (gene.transcriptCount - 1) * 10 + 60;

                    instanceData.push({
                        xFractional: (gene.startIndex - tile.x) / tile.span,
                        y: 0,
                        z: 0,
                        wFractional: gene.length / tile.span,
                        h: height,
                        color: color,
                    });
                }

                let geneInstances = new IntervalInstances(instanceData);
                geneInstances.y = 0;
                geneInstances.z = 0.75;
                geneInstances.mask = this;
                return geneInstances;
            });

            tileObject.layoutParentX = (tile.x - x0) / span;
            tileObject.layoutW = tile.span / span;
            tileObject.opacity = opacity;

            this._onStageAnnotations.get('macro-gene-tile:' + this.contig + ':' + tile.key, () => {
                this.addAnnotation(tileObject);
                return tileObject;
            });
        });
    }

    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, continuousLodLevel: number,  opacity: number) {
        let namesOpacity = 1.0 - Scalar.linstep(this.namesLodThresholdLow, this.namesLodThresholdHigh, continuousLodLevel);

        this.annotationStore.getTiles(x0, x1, samplingDensity, true, (tile) => {
            if (tile.state !== TileState.Complete) {
                // if the tile is incomplete then wait until complete and call updateAnnotations() again
                this._pendingTiles.get(this.contig + ':' + tile.key, () => this.createTileLoadingDependency(tile));
                return;
            }

            for (let gene of tile.payload) {
                // @! temp performance hack, only use node when visible
                // (don't need to do this when using instancing)
                { if (!(gene.startIndex <= x1 && (gene.startIndex + gene.length) >= x0)) continue; }

                // apply gene filter
                if (gene.strand !== this.model.strand) continue;

                let annotationKey =  this.contig + ':' + this.annotationKey(gene);

                let annotation = this._annotationCache.get(annotationKey, () => {
                    // create
                    let object = new GeneAnnotation(gene, this.pointerState);
                    object.y = 40;
                    object.layoutH = 0;
                    object.z = 1 / 4;
                    object.mask = this;
                    object.forEachSubNode((sub) => sub.mask = this);
                    return object;
                });

                (annotation as GeneAnnotation).nameOpacity = namesOpacity;

                this._onStageAnnotations.get(annotationKey, () => {
                    this.addAnnotation(annotation);
                    return annotation;
                });

                annotation.layoutParentX = (gene.startIndex - x0) / span;
                annotation.layoutW = (gene.length) / span;
                annotation.opacity = opacity;
            }
        });
    }

    protected addAnnotation = (annotation: Object2D) => {
        this.add(annotation);
    }

    protected removeAnnotation = (annotation: Object2D) => {
        this.remove(annotation);
    }

    protected deleteAnnotation = (annotation: Object2D) => {
        annotation.releaseGPUResources();
        annotation.forEachSubNode((sub) => {
            sub.releaseGPUResources();
        });
    }

    protected annotationKey = (feature: {
        soClass: string | number,
        name?: string,
        startIndex: number,
        length: number,
    }) => {
        return feature.soClass + '\x1F' + feature.name + '\x1F' + feature.startIndex + '\x1F' + feature.length;
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

    set nameOpacity(v: number) {
        this.name.color[3] = v;
        this.name.visible = v >= 0;
    }

    get nameOpacity() {
        return this.name.color[3];
    }

    protected name: Text;
    protected _opacity: number = 1;

    constructor(protected readonly gene: Gene, trackPointerState: TrackPointerState) {
        super();

        /**
        let spanMarker = new TranscriptSpan(gene.strand);
        spanMarker.color.set([138 / 0xFF, 136 / 0xFF, 191 / 0xFF, 0.38]);
        spanMarker.layoutW = 1;
        spanMarker.h = 10;
        spanMarker.transparent = true;
        this.add(spanMarker);
        InteractiveStyling.colorFromElement('gene', spanMarker.color);
        /**/

        this.name = new Text(OpenSansRegular, gene.name, 16, [1, 1, 1, 1]);
        this.name.layoutY = -1;
        this.name.y = -5;
        this.add(this.name);

        let transcriptOffset = 5;
        let transcriptHeight = 20;
        let transcriptSpacing = 10;

        for (let i = 0; i < gene.transcripts.length; i++) {
            let transcript = gene.transcripts[i];

            let transcriptAnnotation = new TranscriptAnnotation(transcript, gene.strand, this.onTranscriptClick, trackPointerState);
            transcriptAnnotation.h = transcriptHeight;
            transcriptAnnotation.y = i * (transcriptHeight + transcriptSpacing) + transcriptOffset;

            transcriptAnnotation.layoutParentX = (transcript.startIndex - gene.startIndex) / gene.length;
            transcriptAnnotation.layoutW = transcript.length / gene.length;

            this.add(transcriptAnnotation);
        }
    }

    onTranscriptClick = (transcript: Transcript) => {
        if (this.gene.name == null) {
            console.warn(`Cannot search for a gene with no name`, this.gene);
            return;
        }
        // we want to directly open the details view of the entity here
        // @to-do After we switch to use the /reference API
        // 1. Directly use id of the entity data (no query needed), similar to VariantTrack
        // 2. Open gene details when clicking on gene, transcript details when clicking transcript, exon details when clicking exon
        const builder = new QueryBuilder();
        builder.newGenomeQuery();
        builder.filterName(this.gene.name.toUpperCase());
        builder.setLimit(1);
        const geneQuery = builder.build();
        SiriusApi.getQueryResults(geneQuery, false).then(results => {
            if (results.data.length > 0) {
                const entity = results.data[0];
                console.log('@! todo: transcript clicked', entity);
            } else {
                // this is a temporary solution
                alert("Data not found");
            }
        });
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

    constructor(protected readonly transcript: Transcript, strand: Strand, onClick: (transcript: Transcript) => void, trackPointerState: TrackPointerState) {
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
        background.layoutW = 1;
        background.layoutH = 1;

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
                onClick(transcript);
            }
        });

        /**/
        let spanMarker = new TranscriptSpan(strand);
        spanMarker.color.set([138 / 0xFF, 136 / 0xFF, 191 / 0xFF, 0.38]);
        spanMarker.h = 10;
        spanMarker.layoutW = 1;
        spanMarker.layoutY = -0.5;
        spanMarker.layoutParentY = 0.5;
        spanMarker.z = 0.1;
        spanMarker.transparent = true;
        this.add(spanMarker);
        /**/

        // create exons
        for (let exonInfo of transcript.exon) {
            let exon = new Exon();
            exon.z = 0.25;
            exon.layoutH = 1;
            exon.layoutParentX = (exonInfo.startIndex - transcript.startIndex) / transcript.length;
            exon.layoutW = exonInfo.length / transcript.length;
            this.add(exon);
        }

        // create untranslated regions
        for (let utrInfo of transcript.utr) {
            let utr = new UTR();
            utr.z = 0.5;
            utr.layoutH = 1;
            utr.layoutParentX = (utrInfo.startIndex - transcript.startIndex) / transcript.length;
            utr.layoutW = utrInfo.length / transcript.length;
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
            cds.layoutH = 1;
            cds.layoutParentX = (cdsInfo.startIndex - transcript.startIndex) / transcript.length;
            cds.layoutW = cdsInfo.length / transcript.length;
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