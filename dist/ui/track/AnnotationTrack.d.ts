/// <reference types="react" />
import UsageCache from "engine/ds/UsageCache";
import { AnnotationTileStore } from "../../model/data-store/AnnotationTileStore";
import TrackModel from "../../model/TrackModel";
import Object2D from "engine/ui/Object2D";
import TrackObject from "./BaseTrack";
import IntervalInstances from "./util/IntervalInstances";
/**
 * WIP Annotation tracks:
 *
 * Todo:
 * - Convert micro-scale annotations to use instancing (and text batching)
 * - Merge shaders where possible and clean up
 */
export declare class AnnotationTrack extends TrackObject<'annotation'> {
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    protected readonly namesLodBlendRange: number;
    protected readonly namesLodThresholdLow: number;
    protected readonly namesLodThresholdHigh: number;
    protected annotationStore: AnnotationTileStore;
    protected macroAnnotationStore: AnnotationTileStore;
    protected pointerState: TrackPointerState;
    constructor(model: TrackModel<'annotation'>);
    setContig(contig: string): void;
    protected _macroTileCache: UsageCache<IntervalInstances>;
    protected _annotationCache: UsageCache<Object2D>;
    protected _onStageAnnotations: UsageCache<Object2D>;
    protected updateDisplay(): void;
    protected updateMacroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number): void;
    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, continuousLodLevel: number, opacity: number): void;
    protected addAnnotation: (annotation: Object2D) => void;
    protected removeAnnotation: (annotation: Object2D) => void;
    protected deleteAnnotation: (annotation: Object2D) => void;
    protected annotationKey: (feature: {
        soClass: import("react").ReactText;
        name?: string;
        startIndex: number;
        length: number;
    }) => string;
}
declare type TrackPointerState = {
    pointerOver: boolean;
};
export default AnnotationTrack;
