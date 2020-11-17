import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
import { SharedResources } from "engine/SharedResources";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawMode, DrawContext } from "engine/rendering/Renderer";
import { Tile, TileState } from "../TileLoader";
import { AxisPointer, AxisPointerStyle, HighlightPointer, HighlightStyle } from "../TrackObject";
import { Text, Scalar } from "engine";
import { MadaRegular } from "../../ui";
import Animator from "../../Animator";
import { Shaders } from "../../Shaders";
import TrackModel from "../TrackModel";
import { StyleProxy } from "../../ui/util/StyleProxy";

export class SignalTrack<Model extends TrackModel = SignalTrackModel> extends ShaderTrack<Model, SignalTileLoader, SignalTilePayload> {

    autoScale = true;
    autoScaleDelay_ms = 300;

    get displayScale() {
        return this._displayScale;
    }

    set displayScale(value: number) {
        this._displayScale = value;
        this.yAxis.setRange(0, 1 / value);
        this.updateAxisPointerSample();
    }

    protected yAxis: Axis;

    protected signalReading: Text;
    protected yAxisPointer: AxisPointer;
    protected highlightPointer: HighlightPointer;

    readonly signalReadingSnapX = true;
    protected showSignalReading = true;

    protected _displayScale = 1;

    protected sharedState = {
        track: (null as SignalTrack<Model>),
        signalColor: [0.0, 1.0, 0.0],
    }

    constructor(model: Model) {
        super(model, SignalTile);

        this.sharedState.track = this;

        this.yAxis = new Axis({
            x0: 0,
            x1: 1.0,
            align: 'left',
            invert: true,
            clip: false,
            fontSizePx: 14,
            tickSpacingPx: 15,
            color: [1, 1, 1, 1],
        });
        this.yAxis.x = 5;
        this.yAxis.w = 25;
        this.yAxis.h = 0;
        this.yAxis.relativeH = 1;
        this.yAxis.z = 2;
        this.yAxis.mask = this;
        this.add(this.yAxis);

        this.signalReading = new Text(MadaRegular, '', 13, [1, 1, 1, 1]);
        this.signalReading.render = false;
        this.signalReading.x = -20;
        this.signalReading.y = -5;
        this.signalReading.originX = -1;
        this.signalReading.originY = -1;
        this.signalReading.relativeX = 1;
        this.signalReading.z = 3;
        this.signalReading.opacity = 0.6;
        this.signalReading.mask = this;

        if (this.signalReadingSnapX) {
            this.signalReading.originX = 0;
            this.signalReading.x = 10;
        }

        // y-positioning handled in setSignalReading
        this.add(this.signalReading);

        this.yAxisPointer = new AxisPointer(AxisPointerStyle.Secondary, this.activeAxisPointerColor, this.secondaryAxisPointerColor, 'y');
        this.yAxisPointer.render = false;
        this.yAxisPointer.x = 0;
        this.yAxisPointer.y = 0;
        this.yAxisPointer.z = 2;
        // this.yAxisPointer.opacity = 0.3;
        this.yAxisPointer.mask = this;
        this.add(this.yAxisPointer);
        
        this.highlightPointer = new HighlightPointer(HighlightStyle.Secondary, [0.2, 0.2, 0.2, 0], [0.2, 0.2, 0.2, 0], 'x');
        this.highlightPointer.render = true;
        this.highlightPointer.x = 0.5;
        this.highlightPointer.y = 0;
        this.highlightPointer.z = 2;
        this.highlightPointer.mask = this;
        this.add(this.highlightPointer);
        

        if (model.color != null) {
            this.sharedState.signalColor = model.color;
        }

        if (model.autoScale != null) {
            this.autoScale = model.autoScale;
        }

        if (model.scale != null) {
            this.displayScale = model.scale;
        }

        // begin frame loop
        this.frameLoop();

        (window as any).scaleToFit = () => {
            this.scaleToFit();
        }

        (window as any).setDisplayScale = (x: number) => {
            this.setDisplayScale(x);
        }
    }

    applyStyle(styleProxy: StyleProxy) {
        super.applyStyle(styleProxy);

        this.yAxis.color = styleProxy.getColor('color') || this.yAxis.color;
        this.signalReading.color = styleProxy.getColor('color') || this.signalReading.color;

        this.sharedState.signalColor = this.model.color || styleProxy.getColor('--signal-color') || this.sharedState.signalColor;

        this.yAxisPointer.activeColor = this.activeAxisPointerColor;
        this.yAxisPointer.secondaryColor = this.secondaryAxisPointerColor;
        this.yAxisPointer.setStyle(this.yAxisPointer.style);
        
        this.highlightPointer.activeColor = [0.2, 0.2, 0.2, 0.5];
        this.highlightPointer.secondaryColor = [0.2, 0.2, 0.2, 0.5];
        this.highlightPointer.setStyle(this.highlightPointer.style);
    }

    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle) {
        super.setAxisPointer(id, fractionX, style);
        this.updateAxisPointerSample();
    }
    
    setHighlightPointer(id: string, fractionX: number, contig?: string) {
        super.setHighlightPointer(id, fractionX);
    }

    removeAxisPointer(id: string) {
        super.removeAxisPointer(id);
        this.updateAxisPointerSample();
    }

    setDisplayScale(scale: number) {
        Animator.springTo(this, {displayScale: scale}, 200);
    }

    private _animationFrameHandle = -1;

    protected frameLoop = () => {
        this._animationFrameHandle = window.requestAnimationFrame(this.frameLoop);
        this.autoScaleOnFrame();
    }

    private _autoScaleNeedsUpdate = false;
    // private _autoScaleContig: string;
    // private _autoScaleX0: number;
    // private _autoScaleX1: number;
    private _autoScaleLastChangeT_ms: number = -Infinity;

    protected autoScaleNeedsUpdate() {
        if (this.autoScale) {
            this._autoScaleLastChangeT_ms = window.performance.now();

            if (this.autoScaleDelay_ms > 0) {
                this._autoScaleNeedsUpdate = true;
            } else {
                this.scaleToFit();
            }
        }
    }

    protected autoScaleOnFrame() {
        if (this._autoScaleNeedsUpdate && this.autoScale) {
            let dt_ms = window.performance.now() - this._autoScaleLastChangeT_ms;
            if (dt_ms >= this.autoScaleDelay_ms) {
                this.scaleToFit();
                this._autoScaleNeedsUpdate = false;
            }
        }
    }

    protected scaleToFit() {
        // add a little bit of space at the top by multiplying the scale factor by a little
        const spaceAtTheTopMultiplier = 1.05;

        let tileLoader = this.getTileLoader();

        if (tileLoader.ready) {
            let continuousLodLevel = Scalar.log2(Math.max(this.currentSamplingDensity(), 1));
            let lodLevel = Math.floor(continuousLodLevel);
            let visibleLod = tileLoader.mapLodLevel(lodLevel);

            let max = -Infinity;

            tileLoader.forEachValue(this.x0, this.x1, visibleLod, false, (x, r,g,b,a, level) => {
                const maxRGBA = this.maxValue(r, g, b, a);
                if (isFinite(maxRGBA)) max = Math.max(maxRGBA, max);
            });

            if (max > 0) {
                this.setDisplayScale(1 / (max * spaceAtTheTopMultiplier));
            } else {
                // could not find any data for the current visible range
            }
        } else {
            // could not scale because tile loader was not ready
        }
    }

    protected maxValue(r: number, g: number, b:number, a: number) {
        let max = -Infinity;
        if (isFinite(r)) max = Math.max(r, max);
        return max;
    }

    protected tileNodes = new Set<SignalTile>();
    protected createTileNode(): ShaderTile<SignalTilePayload> {
        // create empty tile node
        let tileNode = super.createTileNode(this.sharedState) as SignalTile;
        this.tileNodes.add(tileNode);
        return tileNode;
    }

    protected deleteTileNode(tileNode: ShaderTile<SignalTilePayload>) {
        super.deleteTileNode(tileNode);
        this.tileNodes.delete(tileNode as SignalTile);
    }

    protected updateAxisPointerSample() {
        if (!this.showSignalReading) {
            // hide signal reading
            this.setSignalReading(null);
            return;
        }

        let primary: AxisPointer = null;

        // get primary pointer
        for (let id of Object.keys(this.axisPointers)) {
            let axisPointer = this.axisPointers[id];
            if (axisPointer.style === AxisPointerStyle.Active) {
                primary = axisPointer;
                break;
            }
        }

        // if primary is set and visible then 
        if (primary != null && primary.render) {
            let pointerTrackRelativeX = primary.relativeX;

            let currentReadingLod: number = Infinity;
            // find the signal tile with the lowest LOD
            let tileNode: SignalTile = null;
            
            for (let node of this.tileNodes) {
                // hit-test node
                if (pointerTrackRelativeX >= node.relativeX && pointerTrackRelativeX < (node.relativeX + node.relativeW)) {
                    // within tile x-bounds
                    let tile = node.getTile();
                    if (tile == null) continue;

                    if (tile.lodLevel <= currentReadingLod && tile.state === TileState.Complete) {
                        tileNode = node;
                        currentReadingLod = tile.lodLevel;
                    }
                }
            }

            if (tileNode != null) {
                let tile = tileNode.getTile();
                
                let tileRelativeX = (pointerTrackRelativeX - tileNode.relativeX) / tileNode.relativeW;
                this.setSignalReading(tile.payload.getReading(tileRelativeX, 0));
                
                let highlightRelativeX = (pointerTrackRelativeX + tileNode.relativeX) / tileNode.relativeW;
                
                if (this.signalReadingSnapX) {
                    let signalReadingRelativeWidth = (this.signalReading.getComputedWidth() + Math.abs(this.signalReading.x) * 2) / this.getComputedWidth();
                    this.signalReading.relativeX = Math.min(pointerTrackRelativeX, 1 - signalReadingRelativeWidth);
                }
            } else {
                this.setSignalReading(null);
            }
        } else {
            this.setSignalReading(null);
        }
    }
    
    protected setHighlightValue(value: number) {
        this.highlightPointer.render = true;
        this.highlightPointer.transparent = false;
        this.highlightPointer.relativeX = value;
    }

    protected setSignalReading(value: number | null) {
        if (value === null) {
            this.yAxisPointer.render = false;
            this.signalReading.render = false;
            return;
        }

        this.signalReading.string = value != null ? value.toFixed(3) : 'error';

        let makingVisible = this.yAxisPointer.render === false;

        let relativeY = 1 - (value * this.displayScale);

        let relativeYOfSignalReading = (this.signalReading.getComputedHeight() + Math.abs(this.signalReading.y)*2) / this.getComputedHeight();
        let signalReadingRelativeY = Math.min(Math.max(relativeY, relativeYOfSignalReading), 1);

        const springStrength = 4000;

        if (makingVisible) {
            Animator.stop(this.yAxisPointer, ['relativeY']);
            Animator.stop(this.signalReading, ['relativeY']);
            this.yAxisPointer.relativeY = relativeY;
            this.signalReading.relativeY = signalReadingRelativeY;
        } else {
            Animator.springTo(this.yAxisPointer, { 'relativeY': relativeY}, springStrength);
            Animator.springTo(this.signalReading, { 'relativeY': signalReadingRelativeY}, springStrength);
        }

        this.yAxisPointer.render = true;
        this.signalReading.render = true;
    }

    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        let tileLoader = this.getTileLoader();

        if (tileLoader.ready) {
            this.yAxis.setRange(0, 1 / this.displayScale);
            this.displayLoadingIndicator = false;
            super.updateDisplay(samplingDensity, continuousLodLevel, span, widthPx);
            this.autoScaleNeedsUpdate();
            this.updateAxisPointerSample();
        } else {
            // show loading indicator until tileLoader is ready
            this.displayLoadingIndicator = true;

            if (this._tileNodeCache.count > 0) {
                this._tileNodeCache.removeAll();
            }
            // keep updating display until tileLoader is complete
            this.displayNeedUpdate = true;
        }
    }

}

export class SignalTile extends ShaderTile<SignalTilePayload> {

    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;

    protected signalShaderFunction = `
        vec4 signalRGBA(vec4 textureSample) {
            float signalAlpha = antialiasedSignalAlpha(textureSample.r);
            return vec4(signalColor, signalAlpha);
        }
    `;

    constructor(protected readonly sharedState: SignalTrack['sharedState']) {
        super();
    }

    setTile(tile: Tile<SignalTilePayload>) {
        super.setTile(tile);

        if (this.tile != null) {
            this.memoryBlockY = (tile.blockRowIndex + 0.5) / tile.block.rows.length; // y-center of texel
        }
    }

    allocateGPUResources(device: GPUDevice) {
        // static initializations
        this.gpuVertexState = SharedResources.getQuad1x1VertexState(device);
        this.gpuProgram = SharedResources.getProgram(
            device,
            SignalTile.vertexShader,
            `
                #version 100

                #extension GL_OES_standard_derivatives : enable

                precision mediump float;

                uniform float opacity;
                uniform sampler2D memoryBlock;
                uniform float scaleFactor;
                uniform vec3 backgroundColor;
                uniform vec3 signalColor;

                varying vec2 texCoord;
                varying vec4 rect_px; // x, y, width, height

                float antialiasedSignalAlpha(float signalValue) {
                    float signalHeight_uv = signalValue;
                    float signalTop_px = signalHeight_uv * rect_px[3] + rect_px[1];

                    #ifdef GL_OES_standard_derivatives
                    float signalGradient = dFdx(signalTop_px);
                    #else
                    // we could compute this by sampling left and right texels in memoryBlock
                    // (a value of 0 limits antialiasing)
                    float signalGradient = 0.0;
                    #endif

                    float pixelSignalDist_px = signalTop_px - gl_FragCoord.y;

                    // cheap antialiasing by estimating pixel coverage (using rotatable pixel model)
                    float d = pixelSignalDist_px/sqrt(signalGradient * signalGradient + 1.0);
                    return clamp(0.5 + d, 0.0, 1.0);
                }

                ${this.signalShaderFunction}
                
                void main() {
                    vec4 textureSample = texture2D(memoryBlock, texCoord) * scaleFactor;

                    vec4 signal = signalRGBA(textureSample);

                    // manual premultiplied alpha blending
                    const float blendFactor = 1.0;
                    gl_FragColor = vec4(signal.rgb * signal.a + backgroundColor * (1.0 - clamp(signal.a, 0., 1.)), blendFactor) * opacity;
                }
            `,
            SignalTile.attributeLayout
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
        // we can use viewport size to determine rendered pixel sizes and apply anti-aliasing
        context.uniform2f('viewport', context.viewport.w, context.viewport.h);

        // background color used required because tiles may be opaque (for performance) and opacity = 0 won't work
        let bgColor = this.sharedState.track.color; // assumed to be opaque
        context.uniform3f('backgroundColor', bgColor[0], bgColor[1], bgColor[2]);

        let signalColor = this.sharedState.signalColor;
        context.uniform3f('signalColor', signalColor[0], signalColor[1], signalColor[2]);

        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform1f('opacity', this.opacity);
        context.uniform1f('memoryBlockY', this.memoryBlockY);
        context.uniformTexture2D('memoryBlock', this.gpuTexture);
        context.uniform1f('scaleFactor', this.sharedState.track.displayScale * this.tile.payload.textureUnpackMultiplier);
        context.draw(DrawMode.TRIANGLES, 6, 0);

        this.tile.markLastUsed();
    }

    protected static attributeLayout = [
        { name: 'position', type: AttributeType.VEC2 }
    ];

    protected static vertexShader = `
        #version 100

        precision mediump float;
        attribute vec2 position;
        uniform mat4 model;
        uniform vec2 size;
        uniform float memoryBlockY;

        uniform vec2 viewport;

        varying vec2 texCoord;

        varying vec4 rect_px; // x, y, width, height

        void main() {
            texCoord = vec2(position.x, memoryBlockY);

            gl_Position = model * vec4(position * size, 0., 1.0);

            // we store the rect coordinates in viewport pixels so we can compute pixel offset for anti-aliasing
            // account for y-flip in the model
            vec2 rectBL_px = ((model * vec4(vec2(0.0, 1.0) * size, 0., 1.0)).xy + 1.0) * 0.5 * viewport;
            vec2 rectTL_px = ((model * vec4(vec2(1.0, 0.0) * size, 0., 1.0)).xy + 1.0) * 0.5 * viewport;

            rect_px = vec4(
                rectBL_px,
                rectTL_px - rectBL_px
            );
        }
    `;

}