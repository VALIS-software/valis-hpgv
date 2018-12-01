import { SignalTile, SignalTrack, Shaders } from "genome-visualizer";
import { DualSignalTrackModel } from "./DualSignalTrackModel";

export class DualSignalTrack extends SignalTrack<DualSignalTrackModel> {

    constructor(model: DualSignalTrackModel) {
        super({
            ...model
        });

        this.customTileNodeClass = DualSignalTile;

        // don't show signal readings on hover
        this.showSignalReading = false;
    }

}

class DualSignalTile extends SignalTile {

    protected colorShaderFunction = `
        ${Shaders.functions.palettes.viridis}

        vec3 color(vec4 textureSample, vec2 uv) {
            return
                vec3(
                    // use the first signal to set the red channel
                    step(1.0 - textureSample.r, uv.y),
                    // use the second to set the green channel
                    step(1.0 - textureSample.g, uv.y),
                    0.0
                )
            ;
        }
    `;

}