import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
import { AxisPointer } from "../TrackObject";
import { Text } from "engine";
export declare class SignalTrack<Model extends SignalTrackModel> extends ShaderTrack<Model, SignalTileLoader, SignalTilePayload> {
    protected yAxis: Axis;
    protected signalReading: Text;
    protected yAxisPointer: AxisPointer;
    constructor(model: Model);
    protected setSignalReading(value: number): void;
    protected _currentReadingLod: number;
    protected createTileNode(): ShaderTile<SignalTilePayload>;
    protected updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
}
