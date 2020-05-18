import * as React from "react";
import UsageCache from "engine/ds/UsageCache";
import InteractionEvent from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import Text from "engine/ui/Text";
import { Strand } from "genomics-formats/lib/gff3/Strand";
import IntervalInstances from "../../ui/util/IntervalInstances";
import TrackObject from "../TrackObject";
import { AnnotationTileLoader, Gene } from "./AnnotationTileLoader";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from './AnnotationTrackModel';
import { GenomeFeature } from "./AnnotationTypes";
import { StyleProxy } from "../../ui/util/StyleProxy";
export declare class AnnotationTrack extends TrackObject<AnnotationTrackModel, AnnotationTileLoader> {
    static getDefaultHeightPx(model: any): number;
    static getExpandable(model: AnnotationTrackModel): boolean;
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    protected readonly namesLodBlendRange: number;
    protected readonly namesLodThresholdLow: number;
    protected readonly namesLodThresholdHigh: number;
    protected readonly annotationY: {
        [Strand.Positive]: number;
        [Strand.Negative]: number;
        [Strand.Unknown]: number;
        [Strand.None]: number;
    };
    protected macroModel: MacroAnnotationTrackModel;
    readonly compact: boolean;
    readonly displayLabels: boolean;
    protected colors: {
        '--transcript-arrow': number[];
        '--transcript': number[];
        '--coding': number[];
        '--non-coding': number[];
        '--coding-max-score': number[];
        '--non-coding-max-score': number[];
        '--untranslated': number[];
        'color': number[];
        '--stroke': number[];
    };
    protected sharedState: {
        colors: {
            '--transcript-arrow': number[];
            '--transcript': number[];
            '--coding': number[];
            '--non-coding': number[];
            '--coding-max-score': number[];
            '--non-coding-max-score': number[];
            '--untranslated': number[];
            'color': number[];
            '--stroke': number[];
        };
        style: {
            '--stroke-width': number;
        };
        pointerOver: boolean;
    };
    protected debugOptions: {
        showTileBoundaries: boolean;
    };
    constructor(model: AnnotationTrackModel);
    applyStyle(styleProxy: StyleProxy): void;
    protected _macroTileCache: UsageCache<IntervalInstances>;
    protected _annotationCache: UsageCache<{
        gene: GeneAnnotation;
        name: Text;
    }>;
    protected _onStageAnnotations: UsageCache<Object2D>;
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, continuousLodLevel: number, opacity: number): void;
    protected updateMacroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number): void;
    protected addAnnotation: (annotation: Object2D) => void;
    protected removeAnnotation: (annotation: Object2D) => void;
    protected deleteAnnotation: (annotation: {
        gene: Object2D;
        name: Text;
    }) => void;
    protected annotationKey: (feature: {
        soClass: React.ReactText;
        name?: string;
        startIndex: number;
        length: number;
    }) => string;
    protected onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => void;
}
declare class GeneAnnotation extends Object2D {
    readonly compact: boolean;
    readonly displayLabels: boolean;
    readonly gene: Gene;
    opacity: number;
    protected _opacity: number;
    constructor(compact: boolean, displayLabels: boolean, gene: Gene, sharedState: AnnotationTrack['sharedState'], onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => void);
}
export default AnnotationTrack;
