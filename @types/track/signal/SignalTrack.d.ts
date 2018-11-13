import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
export declare class SignalTrack<Model extends SignalTrackModel> extends ShaderTrack<Model, SignalTileLoader> {
    protected yAxis: Axis;
    constructor(model: Model);
    protected updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
}
