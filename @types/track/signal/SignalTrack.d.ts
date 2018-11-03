import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
export declare class SignalTrack extends ShaderTrack<SignalTrackModel, SignalTileLoader> {
    protected yAxis: Axis;
    constructor(model: SignalTrackModel);
    protected updateDisplay(): void;
}
