import Object2D, { Object2DInternal } from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
import { DrawContext } from "engine/rendering/Renderer";
import GPUDevice from "engine/rendering/GPUDevice";

/**
 * If we're repeating the same text a lot we can improve performance by having a single text instance and re-rendering it at different locations
 * 
 * **The original text instance is modified an should not be rendered on its own after using in a TextClone**
 */
export class TextClone extends Object2D {

    color = new Float32Array(4);
    additiveBlendFactor: number = 0.0;

    set _w(v: number) { }
    set _h(v: number) { }

    get _w() { return this.text.w; }
    get _h() { return this.text.h; }

    set render(v: boolean) { }
    get render() { return this.text.render; }

    constructor(readonly text: Text, color: ArrayLike<number> = [0, 0, 0, 1]) {
        super();
        this.color.set(color);
        this.transparent = true;
        this.blendMode = text.blendMode;
    }

    onAdded() {
        if (this.text.w === 0) {
            this.text.addEventListener('glyphLayoutChanged', this.glyphLayoutChanged);
        }
    }

    allocateGPUResources(device: GPUDevice) {
        let textInternal = (this.text as any as Object2DInternal);

        if (textInternal.gpuResourcesNeedAllocate) {
            textInternal.allocateGPUResources(device);
            textInternal.gpuResourcesNeedAllocate = false;
        }

        this.gpuProgram = textInternal.gpuProgram;
        this.gpuVertexState = textInternal.gpuVertexState;
    }

    releaseGPUResources() { }

    draw(context: DrawContext) {
        let textInternal = (this.text as any as Object2DInternal);

        // override with local transform and color
        textInternal.worldTransformMat4 = this.worldTransformMat4;
        this.text.color = this.color;
        this.text.additiveBlendFactor = this.additiveBlendFactor;

        this.text.draw(context);
    }

    protected glyphLayoutChanged = () => {
        this.worldTransformNeedsUpdate = true;
        this.text.removeEventListener('glyphLayoutChanged', this.glyphLayoutChanged);
    }

}

export default TextClone;