import SequenceTileLoader from "./SequenceTileLoader";
import { ShaderTrack } from "../ShaderTrack";
import { SequenceTrackModel } from './SequenceTrackModel';
export declare class SequenceTrack<Model extends SequenceTrackModel = SequenceTrackModel> extends ShaderTrack<Model, SequenceTileLoader> {
    static defaultHeightPx: number;
    protected densityMultiplier: number;
    constructor(model: Model);
}
export default SequenceTrack;
