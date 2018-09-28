import { BlockPayload, TilePayload } from "../../tile-store/SequenceTileStore";
import { Tile } from "../../tile-store/TileStore";
import { TrackModel } from "../../model/TrackModel";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import Object2D from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
import { ShaderTrack, TileNode } from "./ShaderTrack";
import { TextClone } from "./util/TextClone";
export declare class SequenceTrack extends ShaderTrack<TilePayload, BlockPayload> {
    protected densityMultiplier: number;
    constructor(model: TrackModel);
    protected constructTileNode(): SequenceTile;
}
declare class SequenceTile extends TileNode<TilePayload> {
    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;
    constructor();
    setTile(tile: Tile<TilePayload>): void;
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
