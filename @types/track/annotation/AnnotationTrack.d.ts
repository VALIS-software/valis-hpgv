/// <reference types="react" />
import UsageCache from "engine/ds/UsageCache";
import InteractionEvent from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import Text from "engine/ui/Text";
import IntervalInstances from "../../ui/util/IntervalInstances";
import TrackObject from "../TrackObject";
import { AnnotationTileLoader, Gene } from "./AnnotationTileLoader";
import { AnnotationTrackModel, MacroAnnotationTrackModel } from './AnnotationTrackModel';
import { GenomeFeature } from "./AnnotationTypes";
export declare class AnnotationTrack extends TrackObject<AnnotationTrackModel, AnnotationTileLoader> {
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    protected readonly namesLodBlendRange: number;
    protected readonly namesLodThresholdLow: number;
    protected readonly namesLodThresholdHigh: number;
    protected macroModel: MacroAnnotationTrackModel;
    protected pointerState: TrackPointerState;
    constructor(model: AnnotationTrackModel);
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
        soClass: import("react").Key;
        name?: string;
        startIndex: number;
        length: number;
    }) => string;
    protected onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => void;
}
declare type TrackPointerState = {
    pointerOver: boolean;
};
declare class GeneAnnotation extends Object2D {
    readonly compact: boolean;
    readonly gene: Gene;
    opacity: number;
    protected _opacity: number;
    constructor(compact: boolean, gene: Gene, trackPointerState: TrackPointerState, onAnnotationClicked: (e: InteractionEvent, feature: GenomeFeature, gene: Gene) => void);
}
export default AnnotationTrack;
