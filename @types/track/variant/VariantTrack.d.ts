import UsageCache from "engine/ds/UsageCache";
import InteractionEvent from "engine/ui/InteractionEvent";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import { Text } from "engine/ui/Text";
import IntervalInstances from "../../ui/util/IntervalInstances";
import TextClone from "../../ui/util/TextClone";
import TrackObject from "../TrackObject";
import { VariantTileLoader } from "./VariantTileLoader";
import { VariantTrackModel } from "./VariantTrackModel";
export declare class VariantTrack<Model extends VariantTrackModel = VariantTrackModel> extends TrackObject<Model, VariantTileLoader> {
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    protected pointerOverTrack: boolean;
    constructor(model: Model);
    protected _microTileCache: UsageCache<IntervalInstances>;
    protected _onStageAnnotations: UsageCache<Object2D>;
    protected _sequenceLabelCache: UsageCache<{
        root: Object2D;
        textParent: Object2D;
        text: TextClone;
    }>;
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
    protected displayLabel(variantId: string, baseCharacter: string, color: ArrayLike<number>, startIndex: number, altIndex: number, charIndex: number, relativeX: number, baseLayoutW: number, altHeightPx: number, textSizePx: number, textOpacity: number, tileY: number): void;
    protected createBaseLabel: (baseCharacter: string, color: ArrayLike<number>, onClick: (e: InteractionEvent) => void) => {
        root: Rect;
        textParent: Object2D;
        text: TextClone;
    };
    protected deleteBaseLabel: (label: {
        root: Object2D;
        textParent: Object2D;
        text: TextClone;
    }) => void;
    protected onVariantClicked: (e: InteractionEvent, variantId: string) => void;
    protected static baseTextInstances: {
        [key: string]: Text;
    };
}
export default VariantTrack;
