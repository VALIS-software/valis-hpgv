import SequenceTileLoader, { SequenceTilePayload } from "./SequenceTileLoader";
import { Tile } from "../TileLoader";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import Object2D from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { TextClone } from "../../ui/util/TextClone";
import { SequenceTrackModel } from './SequenceTrackModel';
import { StyleProxy } from "../../ui";
export declare class SequenceTrack<Model extends SequenceTrackModel = SequenceTrackModel> extends ShaderTrack<Model, SequenceTileLoader> {
    static defaultHeightPx: number;
    protected densityMultiplier: number;
    protected sharedState: {
        colors: {
            a: number[];
            t: number[];
            c: number[];
            g: number[];
        };
        baseTextInstances: {
            [letter: string]: Text;
        };
    };
    constructor(model: Model);
    applyStyle(styleProxy: StyleProxy): void;
    protected createTileNode(...args: Array<any>): SequenceTile;
}
/**
 * - A TileNode render field should only be set to true if it's TileEntry is in the Complete state
 */
declare class SequenceTile extends ShaderTile<SequenceTilePayload> {
    protected sharedState: SequenceTrack['sharedState'];
    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;
    constructor(sharedState: SequenceTrack['sharedState']);
    setTile(tile: Tile<SequenceTilePayload>): void;
    private _lastComputedWidth;
    private _lastComputedX;
    applyTransformToSubNodes(root?: boolean): void;
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    draw(context: DrawContext): void;
    private _labelCache;
    protected updateLabels(): void;
    protected createLabel: (baseCharacter: string) => {
        container: Object2D;
        text: TextClone;
    };
    protected deleteLabel: (label: {
        container: Object2D;
        text: TextClone;
    }) => void;
    protected onTileComplete(): void;
    protected static attributeLayout: {
        name: string;
        type: AttributeType;
    }[];
    protected static vertexShader: string;
    protected static getFragmentShader(colors: {
        a: Array<number>;
        t: Array<number>;
        g: Array<number>;
        c: Array<number>;
    }): string;
}
export default SequenceTrack;
