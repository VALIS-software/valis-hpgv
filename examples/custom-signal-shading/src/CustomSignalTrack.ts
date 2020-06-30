import { SignalTile, SignalTrack, Shaders, SignalTrackModel, TrackModel, SignalTileLoader } from "genome-visualizer";

export class CustomSignalTrack extends SignalTrack {

    constructor(model: SignalTrackModel) {
        super({ ...model });
        this.customTileNodeClass = CustomSignalTile;
    }

}

class CustomSignalTile extends SignalTile {

    protected signalShaderFunction = `
		// import the viridis color palette function
		// vec3 viridis( float x )
		${Shaders.functions.palettes.viridis}

        // this function returns the signal image given signal values from the texture
        vec4 signalRGBA(vec4 data) {
			float normalizedSignalValue = data.x;
			float signalMask = antialiasedSignalAlpha(normalizedSignalValue); // to use as alpha channel

			vec3 signalColor = viridis(normalizedSignalValue); // generate a color from the signal value

			return vec4(signalColor, signalMask);
        }
    `;

}