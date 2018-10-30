import SequenceTileLoader from "./SequenceTileLoader";
import { ShaderTrack } from "../ShaderTrack";
import { SequenceTrackModel } from './SequenceTrackModel';
export declare class SequenceTrack extends ShaderTrack<SequenceTrackModel, SequenceTileLoader> {
    protected densityMultiplier: number;
    constructor(model: SequenceTrackModel);
}
export default SequenceTrack;
