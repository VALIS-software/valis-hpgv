import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import { Tile } from "../TileLoader";
import { AxisPointer, AxisPointerStyle } from "../TrackObject";
import { Text } from "engine";
export declare class SignalTrack<Model extends SignalTrackModel> extends ShaderTrack<Model, SignalTileLoader, SignalTilePayload> {
    protected yAxis: Axis;
    protected signalReading: Text;
    protected yAxisPointer: AxisPointer;
    readonly signalReadingSnapX: boolean;
    constructor(model: Model);
    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle): void;
    removeAxisPointer(id: string): void;
    protected tileNodes: Set<SignalTile>;
    protected createTileNode(): ShaderTile<SignalTilePayload>;
    protected deleteTileNode(tileNode: ShaderTile<SignalTilePayload>): void;
    protected updateAxisPointerSample(): void;
    protected setSignalReading(value: number | null): void;
    protected updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
}
declare class SignalTile extends ShaderTile<SignalTilePayload> {
    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;
    setTile(tile: Tile<SignalTilePayload>): void;
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    draw(context: DrawContext): void;
    protected static attributeLayout: {
        name: string;
        type: AttributeType;
    }[];
    protected static vertexShader: string;
    protected static fragmentShader: string;
}
export {};
