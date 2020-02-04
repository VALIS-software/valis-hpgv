import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import { Tile } from "../TileLoader";
import { AxisPointer, AxisPointerStyle, HighlightPointer } from "../TrackObject";
import { Text } from "engine";
import TrackModel from "../TrackModel";
import { StyleProxy } from "../../ui/util/StyleProxy";
export declare class SignalTrack<Model extends TrackModel = SignalTrackModel> extends ShaderTrack<Model, SignalTileLoader, SignalTilePayload> {
    autoScale: boolean;
    autoScaleDelay_ms: number;
    displayScale: number;
    protected yAxis: Axis;
    protected signalReading: Text;
    protected yAxisPointer: AxisPointer;
    protected highlightPointer: HighlightPointer;
    readonly signalReadingSnapX: boolean;
    protected showSignalReading: boolean;
    protected _displayScale: number;
    protected sharedState: {
        track: SignalTrack<Model>;
        signalColor: number[];
    };
    constructor(model: Model);
    applyStyle(styleProxy: StyleProxy): void;
    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle): void;
    setHighlightPointer(id: string, fractionX: number, contig?: string): void;
    removeAxisPointer(id: string): void;
    setDisplayScale(scale: number): void;
    private _animationFrameHandle;
    protected frameLoop: () => void;
    private _autoScaleNeedsUpdate;
    private _autoScaleLastChangeT_ms;
    protected autoScaleNeedsUpdate(): void;
    protected autoScaleOnFrame(): void;
    protected scaleToFit(): void;
    protected maxValue(r: number, g: number, b: number, a: number): number;
    protected tileNodes: Set<SignalTile>;
    protected createTileNode(): ShaderTile<SignalTilePayload>;
    protected deleteTileNode(tileNode: ShaderTile<SignalTilePayload>): void;
    protected updateAxisPointerSample(): void;
    protected setHighlightValue(value: number): void;
    protected setSignalReading(value: number | null): void;
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
}
export declare class SignalTile extends ShaderTile<SignalTilePayload> {
    protected readonly sharedState: SignalTrack['sharedState'];
    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;
    protected signalShaderFunction: string;
    constructor(sharedState: SignalTrack['sharedState']);
    setTile(tile: Tile<SignalTilePayload>): void;
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    draw(context: DrawContext): void;
    protected static attributeLayout: {
        name: string;
        type: AttributeType;
    }[];
    protected static vertexShader: string;
}
