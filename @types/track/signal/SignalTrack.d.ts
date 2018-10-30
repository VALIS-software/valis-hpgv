import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack } from "../ShaderTrack";
export declare class SignalTrack extends ShaderTrack<SignalTrackModel, SignalTileLoader> {
    constructor(model: SignalTrackModel);
    protected updateDisplay(): void;
}
