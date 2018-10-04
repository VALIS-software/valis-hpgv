import { TrackModel } from "../model/TrackModel";
import AnnotationTrack from "./annotation/AnnotationTrack";
import SequenceTrack from "./sequence/SequenceTrack";
import TrackObject from "./TrackObject";
import VariantTrack from "./variant/VariantTrack";
import IntervalTrack from "./interval/IntervalTrack";

export function ConstructTrack(model: TrackModel) {
    switch (model.type) {
        case 'empty': return new TrackObject(model);
        case 'sequence': return new SequenceTrack(model as TrackModel<'sequence'>);
        case 'annotation': return new AnnotationTrack(model as TrackModel<'annotation'>);
        case 'variant': return new VariantTrack(model as TrackModel<'variant'>);
        case 'interval': return new IntervalTrack(model as TrackModel<'interval'>);
        default: {
            console.error(`Not able to construct a "${model.type}" track`);
            return null;
        }
    }
}

export default ConstructTrack;