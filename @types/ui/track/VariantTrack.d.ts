import UsageCache from "engine/ds/UsageCache";
import { VariantTileStore } from "../../tile-store/VariantTileStore";
import { TrackModel } from "../../model/TrackModel";
import Object2D from "engine/ui/Object2D";
import { Rect } from "engine/ui/Rect";
import { Text } from "engine/ui/Text";
import TrackObject from "./BaseTrack";
import IntervalInstances from "./util/IntervalInstances";
import TextClone from "./util/TextClone";
export declare class VariantTrack extends TrackObject<'variant'> {
    protected readonly macroLodBlendRange: number;
    protected readonly macroLodThresholdLow: number;
    protected readonly macroLodThresholdHigh: number;
    protected tileStore: VariantTileStore;
    protected pointerOverTrack: boolean;
    constructor(model: TrackModel<'variant'>);
    setContig(contig: string): void;
    protected _microTileCache: UsageCache<IntervalInstances>;
    protected _onStageAnnotations: UsageCache<Object2D>;
    protected _sequenceLabelCache: UsageCache<{
        root: Object2D;
        textParent: Object2D;
        text: TextClone;
    }>;
    protected updateDisplay(): void;
    protected displayLabel(variantId: string, baseCharacter: string, color: ArrayLike<number>, startIndex: number, altIndex: number, charIndex: number, layoutParentX: number, baseLayoutW: number, altHeightPx: number, textSizePx: number, textOpacity: number, tileY: number): void;
    protected createBaseLabel: (baseCharacter: string, color: ArrayLike<number>, onClick: () => void) => {
        root: Rect;
        textParent: Object2D;
        text: TextClone;
    };
    protected deleteBaseLabel: (label: {
        root: Object2D;
        textParent: Object2D;
        text: TextClone;
    }) => void;
    protected static baseTextInstances: {
        [key: string]: Text;
    };
}
export default VariantTrack;
