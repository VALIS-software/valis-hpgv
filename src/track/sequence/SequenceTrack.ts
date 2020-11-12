import { UsageCache } from "engine/ds/UsageCache";
import { Scalar } from "engine/math/Scalar";
import SequenceTileLoader, { SequenceTilePayload } from "./SequenceTileLoader";
import { Tile, TileState } from "../TileLoader";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawContext, DrawMode } from "engine/rendering/Renderer";
import Object2D from "engine/ui/Object2D";
import SharedResources from "engine/SharedResources";
import { Text } from "engine/ui/Text";
import { MadaRegular } from "../../ui/font/Fonts";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { TextClone } from "../../ui/util/TextClone";
import { SequenceTrackModel } from './SequenceTrackModel';
import { Shaders } from "../../Shaders";
import { StyleProxy } from "../../ui";

export class SequenceTrack<Model extends SequenceTrackModel = SequenceTrackModel> extends ShaderTrack<Model, SequenceTileLoader> {

    static getDefaultHeightPx(model: any) {
        return 40;
    };

    protected densityMultiplier = 2.0;
    protected sharedState = {
        colors: {
            a: [0.216, 0.063, 0.318, 1.0],
            t: [0.200, 0.200, 0.404, 1.0],
            c: [0.043, 0.561, 0.608, 1.0],
            g: [0.071, 0.725, 0.541, 1.0],
            
            gcBandingLow: [0.286, 0, 0.502, 1],
            gcBandingHigh: [0.106, 1, 0.627, 1],

            color: [1, 1, 1, 0.7],
            textAdditiveBlendFactor: 1.0,
        },

        // we only need 1 text instance of each letter which we can render multiple times
        // this saves reallocating new vertex buffers for each letter
        baseTextInstances: ({
            'A': new Text(MadaRegular, 'A', 1),
            'C': new Text(MadaRegular, 'C', 1),
            'G': new Text(MadaRegular, 'G', 1),
            'T': new Text(MadaRegular, 'T', 1),
            'N': new Text(MadaRegular, 'N', 1),
        } as { [letter: string]: Text }),

        backgroundColor: this.color,
    }
 
    constructor(model: Model) {
        super(model, SequenceTile);
        this.loadingIndicatorPadding = 0.5; // make it slower to appear then normal
    }

    applyStyle(styleProxy: StyleProxy) {
        super.applyStyle(styleProxy);
        this._tileNodeCache.removeAll();
        this.displayNeedUpdate = true;

        this.sharedState.colors.a = styleProxy.getColor('--nucleobase-a') || this.sharedState.colors.a;
        this.sharedState.colors.t = styleProxy.getColor('--nucleobase-t') || this.sharedState.colors.t;
        this.sharedState.colors.c = styleProxy.getColor('--nucleobase-c') || this.sharedState.colors.c;
        this.sharedState.colors.g = styleProxy.getColor('--nucleobase-g') || this.sharedState.colors.g;
        
        this.sharedState.colors.gcBandingLow = styleProxy.getColor('--gc-banding-low') || this.sharedState.colors.gcBandingLow;
        this.sharedState.colors.gcBandingHigh = styleProxy.getColor('--gc-banding-high') || this.sharedState.colors.gcBandingHigh;

        this.sharedState.colors.color = styleProxy.getColor('color') || this.sharedState.colors.color;
        let textAdditiveBlendFactor = styleProxy.getNumber('--text-additive-blending')
        this.sharedState.colors.textAdditiveBlendFactor = (textAdditiveBlendFactor != null) ? textAdditiveBlendFactor : this.sharedState.colors.textAdditiveBlendFactor;

        this.sharedState.backgroundColor = this.color;
    }

    protected createTileNode(...args: Array<any>): SequenceTile {
        return super.createTileNode(this.sharedState) as SequenceTile;
    }

}

/**
 * - A TileNode render field should only be set to true if it's TileEntry is in the Complete state
 */

class SequenceTile extends ShaderTile<SequenceTilePayload> {

    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;

    constructor(protected sharedState: SequenceTrack['sharedState']) {
        super();
    }

    setTile(tile: Tile<SequenceTilePayload>) {
        super.setTile(tile);

        if (this.tile != null) {
            this.memoryBlockY = (tile.blockRowIndex + 0.5) / tile.block.rows.length; // y-center of texel
        }
    }

    private _lastComputedWidth: number;
    private _lastComputedX: number;
    applyTransformToSubNodes(root?: boolean) {
        // updateLabels depends on computedWidth and relativeX, if any of those has changed we need to call it
        if (
            this.computedWidth !== this._lastComputedWidth ||
            this._lastComputedX !== this.computedX
        ) {
            this._lastComputedWidth = this.computedWidth;
            this._lastComputedX = this.computedX;
            // update labels when laying out scene-graph
            this.updateLabels();
        }

        super.applyTransformToSubNodes(root);
    }

    allocateGPUResources(device: GPUDevice) {
        // static initializations
        this.gpuVertexState = SharedResources.getQuad1x1VertexState(device);
        this.gpuProgram = SharedResources.getProgram(
            device,
            SequenceTile.vertexShader,
            SequenceTile.getFragmentShader(this.sharedState.colors),
            SequenceTile.attributeLayout
        );

        // we assume .tile is set and in the complete state before allocateGPUResources is called
        this.gpuTexture = this.tile.payload.getTexture(device);
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
        this.gpuTexture = null;
    }

    draw(context: DrawContext) {
        let payload = this.tile.payload;

        let bgColor = this.sharedState.backgroundColor; // assumed to be opaque
        context.uniform3f('backgroundColor', bgColor[0], bgColor[1], bgColor[2]);

        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform1f('opacity', this.opacity);
        context.uniform1f('memoryBlockY', this.memoryBlockY);
        context.uniform3f('offsetScaleLod', payload.sequenceMinMax.min, (payload.sequenceMinMax.max - payload.sequenceMinMax.min), this.displayLodLevel);
        context.uniformTexture2D('memoryBlock', this.gpuTexture);
        context.draw(DrawMode.TRIANGLES, 6, 0);

        this.tile.markLastUsed();
    }

    private _labelCache = new UsageCache<{container: Object2D, text: TextClone}>(
        null,
        (label) => this.deleteLabel(label),
    );
    protected updateLabels() {
        let tile = this.tile;
        this._labelCache.markAllUnused();

        if (tile != null) {
            if (tile.lodLevel === 0 && tile.state === TileState.Complete) {
                let data = tile.payload.array;

                let baseWidth = 1 / tile.lodSpan;            
                let baseDisplayWidth = this.computedWidth * baseWidth;

                const maxTextSize = 16;
                const minTextSize = 5;
                const padding = 3;
                const maxOpacity = 1.0;
                
                let textSizePx = Math.min(baseDisplayWidth - padding, maxTextSize);
                let textOpacity = Math.min(Math.max((textSizePx - minTextSize) / (maxTextSize - minTextSize), 0.0), 1.0) * maxOpacity;
                textOpacity = textOpacity * textOpacity;

                if (textOpacity > 0 && textSizePx > 0) {

                    let nChannels = 4;
                    let nBases = tile.payload.array.length / nChannels;

                    // determine the portion of this tile that's visible, only touch labels for this portion
                    // we assume:
                    //     - relativeX and relativeW are used for positioning
                    //     - x >= 0 and x <= 1 is visible range
                    let visibleX0 = -this.relativeX / this.relativeW;
                    let visibleX1 = (1 - this.relativeX) / this.relativeW;
                    let firstVisibleBase = Scalar.clamp(Math.floor(visibleX0 / baseWidth), 0, nBases - 1);
                    let lastVisibleBase = Scalar.clamp(Math.floor(visibleX1 / baseWidth), 0, nBases - 1);

                    const proportionThreshold = 0.5;
                    
                    for (let i = firstVisibleBase; i <= lastVisibleBase; i++) {
                        let a = data[i * 4 + 0] / 0xFF;
                        let c = data[i * 4 + 1] / 0xFF;
                        let g = data[i * 4 + 2] / 0xFF;
                        let t = data[i * 4 + 3] / 0xFF;
                        
                        // determine a nucleobase character to display
                        let baseChar: string;

                        if (a > proportionThreshold) { baseChar = 'A'; } else
                        if (c > proportionThreshold) { baseChar = 'C'; } else
                        if (t > proportionThreshold) { baseChar = 'T'; } else
                        if (g > proportionThreshold) { baseChar = 'G'; } else {
                            baseChar = 'N'; // any nucleobase
                        }

                        let label = this._labelCache.get(i + '', () => this.createLabel(baseChar));
                        label.container.relativeX = (i + 0.5) * baseWidth;
                        label.container.relativeY = 0.5;

                        label.container.sx = label.container.sy = textSizePx;

                        label.text.mask = this.mask;
                        label.text.opacity = textOpacity;
                    }
                }
                
            }
        }

        this._labelCache.removeUnused();
    }

    protected createLabel = (baseCharacter: string) => {        
        let textClone = new TextClone(this.sharedState.baseTextInstances[baseCharacter], this.sharedState.colors.color);
        textClone.additiveBlending = this.sharedState.colors.textAdditiveBlendFactor;

        textClone.originX = -0.5;
        textClone.originY = -0.5;

        let container = new Object2D();
        container.add(textClone);

        this.add(container);
        return {container: container, text: textClone};
    }

    protected deleteLabel = (label: { container: Object2D, text: TextClone }) => {
        label.container.remove(label.text); // ensure textClone cleanup is fired
        label.text.releaseGPUResources();
        this.remove(label.container);
    }

    protected onTileComplete() {
        super.onTileComplete();
        this.updateLabels();
    }

    protected static attributeLayout = [
        { name: 'position', type: AttributeType.VEC2 }
    ];

    protected static vertexShader = `
        #version 100

        attribute vec2 position;
        uniform mat4 model;
        uniform vec2 size;
        uniform float memoryBlockY;

        varying vec2 texCoord;
        varying vec2 vUv;

        void main() {
            texCoord = vec2(position.x, memoryBlockY);
            vUv = position;
            gl_Position = model * vec4(position * size, 0., 1.0);
        }
    `;

    protected static getFragmentShader(colors: SequenceTrack['sharedState']['colors']) {
        return `
            #version 100

            precision mediump float;
            uniform float opacity;
            uniform sampler2D memoryBlock;
            uniform vec3 offsetScaleLod;
            uniform vec3 backgroundColor;

            varying vec2 texCoord;
            varying vec2 vUv;

            ${Shaders.functions.palettes.viridis}
            
            void main() {
                // %a,%c,%g,%t
                vec4 texRaw = texture2D(memoryBlock, texCoord);

                float sum = dot(abs(texRaw), vec4(1.0));
                // when a texel has valid data, it should sum to ~1
                float dataAvailable = step(0.5, sum);

                // unpack data
                vec4 acgt = texRaw * offsetScaleLod.y + offsetScaleLod.x;

                // micro-scale color
                const vec3 aRgb = vec4(${colors.a.join(', ')}).rgb;
                const vec3 tRgb = vec4(${colors.t.join(', ')}).rgb;
                const vec3 cRgb = vec4(${colors.c.join(', ')}).rgb;
                const vec3 gRgb = vec4(${colors.g.join(', ')}).rgb;
                const vec3 gcBandingLow = vec4(${colors.gcBandingLow.join(', ')}).rgb;
                const vec3 gcBandingHigh = vec4(${colors.gcBandingHigh.join(', ')}).rgb;

                vec3 colMicro = (
                    acgt[0] * aRgb +
                    acgt[1] * cRgb +
                    acgt[2] * gRgb +
                    acgt[3] * tRgb
                );

                // blend into to macro-scale color
                // macro-scale simulates g-banding with a non-linear response
                float tileLodLevel = offsetScaleLod.z;
                float q = tileLodLevel - 5.0;
                float expectedSpan = min(pow(0.9, q), 1.0);
                float expectedAvg = min(pow(0.8, q) * 0.25 + 0.25, 0.5);
                vec4 acgtScaled = (acgt - expectedAvg) / expectedSpan + 0.5;

                float gc = (acgtScaled[1] + acgtScaled[2]) * 0.5;
                
                vec3 colMacro = (
                    mix(gcBandingLow, gcBandingHigh, gc)
                    // tend to white at gc highest-density
                    + vec3(30.) * pow(gc, 12.0)
                );

                const float microScaleEndLod = 4.5;
                float displayLodLevel = offsetScaleLod.z;
                float microMacroMix = clamp((displayLodLevel - microScaleEndLod) / microScaleEndLod, 0., 1.0);

                gl_FragColor = vec4(mix(colMicro, colMacro, microMacroMix), 1.0) * opacity * dataAvailable;
                
                // display nothing (background color) if there's no data
                // we use the background color rather than just opacity 0 because the tile may have opaque blending
                gl_FragColor = mix(vec4(backgroundColor, 1.0), gl_FragColor, dataAvailable);


                /**
                // for debug: makes tiling visible
                float debugMask = step(0.45, vUv.y) * step(vUv.y, 0.55);
                vec4 debugColor = vec4(vUv.xxx, 1.0);
                gl_FragColor = mix(gl_FragColor, debugColor, debugMask);
                /**/
            }
        `;
    }
}

export default SequenceTrack;