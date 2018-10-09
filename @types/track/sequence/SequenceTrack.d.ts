import { SequenceTilePayload } from "./SequenceTileLoader";
import { Tile } from "../TileLoader";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import Object2D from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
import { ShaderTrack, TileNode } from "../ShaderTrack";
import { TextClone } from "../../ui/util/TextClone";
import { SequenceTrackModel } from './SequenceTrackModel';
export declare class SequenceTrack extends ShaderTrack<SequenceTrackModel, SequenceTilePayload> {
    protected densityMultiplier: number;
    constructor(model: SequenceTrackModel);
    protected constructTileNode(): SequenceTile;
    static thing(): number;
}
declare class SequenceTile extends TileNode<SequenceTilePayload> {
    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;
    constructor();
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
    protected static fragmentShader: string;
    protected static baseTextInstances: {
        [key: string]: Text;
    };
}
export default SequenceTrack;
