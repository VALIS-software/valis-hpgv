import GPUDevice, { AttributeLayout, VertexAttributeBuffer } from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import Object2DInstances from "engine/ui/Object2DInstances";
export declare type IntervalInstance = {
    x: number;
    y: number;
    z: number;
    relativeX: number;
    relativeY: number;
    w: number;
    h: number;
    relativeW: number;
    relativeH: number;
    color: Array<number>;
};
export declare class IntervalInstances extends Object2DInstances<IntervalInstance> {
    minWidth: number;
    blendFactor: number;
    borderStrength: number;
    constructor(instances: Array<IntervalInstance>);
    draw(context: DrawContext): void;
    protected allocateGPUVertexState(device: GPUDevice, attributeLayout: AttributeLayout, instanceVertexAttributes: {
        [name: string]: VertexAttributeBuffer;
    }): import("engine/rendering/GPUDevice").GPUVertexState;
    protected getVertexCode(): string;
    protected getFragmentCode(): string;
}
export default IntervalInstances;
