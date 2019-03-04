import TrackObject from "./TrackObject";

export type TrackEvent = {
    type: string,
    trackObject: TrackObject,

    [key: string]: any,
}