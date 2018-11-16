import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
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
    protected _currentReadingLod: number;
    protected updateAxisPointerSample(): void;
    protected setSignalReading(value: number): void;
    protected updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
}
