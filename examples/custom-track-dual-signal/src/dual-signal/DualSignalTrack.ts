import { SignalTile, SignalTrack, Shaders } from "genome-visualizer";
import { DualSignalTrackModel } from "./DualSignalTrackModel";

export class DualSignalTrack extends SignalTrack<DualSignalTrackModel> {

    constructor(model: DualSignalTrackModel) {
        super({ ...model });

        this.customTileNodeClass = DualSignalTile;

        // don't show signal readings on hover
        this.showSignalReading = false;
    }

    // we override the maxValue method so that the green channel is accounted for when auto scaling 
    protected maxValue(r: number, g: number, b: number, a: number) {
        let max = -Infinity;
        if (isFinite(r)) max = Math.max(r, max);
        if (isFinite(g)) max = Math.max(g, max);
        return max;
    }

}

class DualSignalTile extends SignalTile {

    protected signalShaderFunction = `
        // this function returns the signal image given signal values from the texture
        vec4 signalRGBA(vec4 textureSample) {
            // uncomment the following line to see the raw signal data
            // return vec4(textureSample.rg, 0., 1.);

            float signalAlpha1 = antialiasedSignalAlpha(textureSample.r);
            float signalAlpha2 = antialiasedSignalAlpha(textureSample.g);

            // red signal
            vec4 signal1 = vec4(vec3(1., 0., 0.) * signalAlpha1, signalAlpha1);

            // green signal
            vec4 signal2 = vec4(vec3(0., 1., 0.) * signalAlpha2, signalAlpha2);

            // add the two signals together
            // we could perform more other operations here to help study the data
            // for example, we could multiply the signals to find overlapping regions

            return signal1 + signal2;
        }
    `;

}