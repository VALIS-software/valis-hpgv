import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import { ShaderTrack, ShaderTile } from "../ShaderTrack";
import { Axis } from "../../ui/Axis";
import { SharedResources } from "engine/SharedResources";
import GPUDevice, { AttributeType, GPUTexture } from "engine/rendering/GPUDevice";
import { DrawMode, DrawContext } from "engine/rendering/Renderer";
import { Tile, TileState } from "../TileLoader";
import { AxisPointer, AxisPointerStyle } from "../TrackObject";
import { Text } from "engine";
import { OpenSansRegular } from "../../ui";
import Animator from "../../Animator";

export class SignalTrack<Model extends SignalTrackModel> extends ShaderTrack<Model, SignalTileLoader, SignalTilePayload> {

    protected yAxis: Axis;

    protected signalReading: Text;
    protected yAxisPointer: AxisPointer;

    constructor(model: Model) {
        super(model, SignalTile);

        this.yAxis = new Axis({
            x0: 0,
            x1: 1.0,
            align: 'left',
            invert: true,
            clip: false,
            fontSizePx: 10,
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

        // when true, the signal reading text sticks to the x-axis cursor
        const signalReadingSnapX = true;

        this.signalReading = new Text(OpenSansRegular, '', 13, [1, 1, 1, 1]);
        this.signalReading.render = false;
        this.signalReading.x = -20;
        this.signalReading.y = -5;
        this.signalReading.originX = -1;
        this.signalReading.originY = -1;
        this.signalReading.relativeX = 1;
        this.signalReading.z = 3;
        this.signalReading.opacity = 0.6;

        if (signalReadingSnapX) {
            this.signalReading.originX = 0;
            this.signalReading.x = 10;
            this.addInteractionListener('pointermove', (e) => {
                let signalReadingRelativeWidth = (this.signalReading.getComputedWidth() + Math.abs(this.signalReading.x) * 2) / this.getComputedWidth();
                this.signalReading.relativeX = Math.min(e.fractionX, 1 - signalReadingRelativeWidth);
            });
        }
        // y-positioning handled in setSignalReading
        this.add(this.signalReading);

        this.yAxisPointer = new AxisPointer(AxisPointerStyle.Active, this.activeAxisPointerColor, this.secondaryAxisPointerColor, 'y');
        this.yAxisPointer.render = false;
        this.yAxisPointer.x = 0;
        this.yAxisPointer.y = 0;
        this.yAxisPointer.z = 2;
        this.yAxisPointer.opacity = 0.3;
        this.add(this.yAxisPointer);

        this.addInteractionListener('pointerleave', () => {
            this.yAxisPointer.render = false;
            this.signalReading.render = false;
        });
    }

    protected setSignalReading(value: number) {
        this.signalReading.string = value != null ? value.toFixed(3) : 'error';

        let makingVisible = this.yAxisPointer.render === false;

        let relativeY = 1 - value;

        let relativeYOfSignalReading = (this.signalReading.getComputedHeight() + Math.abs(this.signalReading.y)*2) / this.getComputedHeight();
        let signalReadingRelativeY = Math.min(Math.max(relativeY, relativeYOfSignalReading), 1);

        if (makingVisible) {
            Animator.stop(this.yAxisPointer, ['relativeY']);
            Animator.stop(this.signalReading, ['relativeY']);
            this.yAxisPointer.relativeY = relativeY;
            this.signalReading.relativeY = signalReadingRelativeY;
        } else {
            Animator.springTo(this.yAxisPointer, { 'relativeY': relativeY}, 5000);
            Animator.springTo(this.signalReading, { 'relativeY': signalReadingRelativeY}, 5000);
        }

        this.yAxisPointer.render = true;
        this.signalReading.render = true;
    }

    protected _currentReadingLod: number = Infinity;
    protected createTileNode(): ShaderTile<SignalTilePayload> {
        let tileNode = super.createTileNode();

        tileNode.addInteractionListener('pointermove', (e) => {
            let tile = tileNode.getTile();

            if (tile.lodLevel <= this._currentReadingLod) {

                if (tile.state === TileState.Complete) {
                    this.setSignalReading(tile.payload.getReading(e.fractionX));
                    this._currentReadingLod = tile.lodLevel;
                }
                
            }
        });
        return tileNode;
    }

    protected updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        let tileLoader = this.getTileLoader();

        if (tileLoader.ready) {
            this.yAxis.setRange(0, 1 / tileLoader.scaleFactor);
            this.displayLoadingIndicator = false;
            super.updateDisplay(samplingDensity, continuousLodLevel, span, widthPx);
        } else {
            // show loading indicator until tileLoader is ready
            this.displayLoadingIndicator = true;

            if (this._tileNodeCache.count > 0) {
                this._tileNodeCache.removeAll(this.deleteTileNode);
            }
            // keep updating display until tileLoader is complete
            this.displayNeedUpdate = true;
        }

        this._currentReadingLod = Infinity;
    }

}

class SignalTile extends ShaderTile<SignalTilePayload> {

    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;

    setTile(tile: Tile<SignalTilePayload>) {
        super.setTile(tile);

        if (this.tile != null) {
            this.memoryBlockY = (tile.blockRowIndex + 0.5) / tile.block.rows.length; // y-center of texel
        }
    }

    allocateGPUResources(device: GPUDevice) {
        // static initializations
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            SignalTile.vertexShader,
            SignalTile.fragmentShader,
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
        let payload = this.tile.payload;

        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform1f('opacity', this.opacity);
        context.uniform1f('memoryBlockY', this.memoryBlockY);
        context.uniformTexture2D('memoryBlock', this.gpuTexture);
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

        varying vec2 texCoord;
        varying vec2 vUv;

        void main() {
            texCoord = vec2(position.x, memoryBlockY);
            vUv = position;
            gl_Position = model * vec4(position * size, 0., 1.0);
        }
    `;

    protected static fragmentShader = `
        #version 100

        precision mediump float;
        uniform float opacity;
        uniform sampler2D memoryBlock;
        uniform vec2 size;

        varying vec2 texCoord;
        varying vec2 vUv;

        vec3 viridis( float x ) {
            x = clamp(x, 0., 1.0);
            vec4 x1 = vec4( 1.0, x, x * x, x * x * x ); // 1 x x2 x3
            vec4 x2 = x1 * x1.w * x; // x4 x5 x6 x7
            return vec3(
                dot( x1, vec4( +0.280268003, -0.143510503, +2.225793877, -14.81508888 ) ) + dot( x2.xy, vec2( +25.212752309, -11.77258958 ) ),
                dot( x1, vec4( -0.002117546, +1.617109353, -1.909305070, +2.701152864 ) ) + dot( x2.xy, vec2(  -1.685288385, +0.178738871 ) ),
                dot( x1, vec4( +0.300805501, +2.614650302, -12.01913909, +28.93355911 ) ) + dot( x2.xy, vec2( -33.491294770, +13.76205384 ) )
            );
        }
        
        void main() {
            vec4 texRaw = texture2D(memoryBlock, texCoord);

            // heatmap style
            #if 0
            vec3 col = viridis(texRaw.r);
            #else
            vec3 col = step(1.0 - texRaw.r, vUv.y) * viridis(texRaw.r * vUv.y);
            #endif

            #if 0
            float debug = step((1.0 - vUv.y) * size.y, 5.);
            col = mix( col, vec3( 0., vUv.xy ), debug);
            #endif
            
            gl_FragColor = vec4(col, 1.0) * opacity;
        }
    `;

}