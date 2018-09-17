import { TrackModel } from "../../model/TrackModel";
import TrackObject from "./BaseTrack";
export declare function ConstructTrack(model: TrackModel): TrackObject<"empty" | "sequence" | "annotation" | "variant" | "interval">;
export default ConstructTrack;
