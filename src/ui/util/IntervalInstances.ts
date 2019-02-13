import GPUDevice, { AttributeLayout, AttributeType, VertexAttributeBuffer } from "engine/rendering/GPUDevice";
import { DrawContext, DrawMode } from "engine/rendering/Renderer";
import SharedResources from "engine/SharedResources";
import Object2DInstances from "engine/ui/Object2DInstances";

export type IntervalInstance = {
    // position in pixels (dom units)
    x: number, y: number, z: number,
    // fractional position relative to the IntervalInstances object
    relativeX: number, relativeY: number,

    // size in pixels (dom units)
    w: number, h: number,
    // fractional size relative to the IntervalInstances object
    relativeW: number, relativeH: number,

    color: Array<number>,
};

export class IntervalInstances extends Object2DInstances<IntervalInstance> {

    minWidth: number = 0;
    additiveBlending: number = 0;
    borderStrength: number = 0.3;

    constructor(instances: Array<IntervalInstance>) {
        super(
            instances,
            [
                { name: 'position', type: AttributeType.VEC2 }
            ],
            [
                { name: 'instanceAbsPosition', type: AttributeType.VEC3 },
                { name: 'instanceRelPosition', type: AttributeType.VEC2 },
                { name: 'instanceSize', type: AttributeType.VEC4 },
                { name: 'instanceColor', type: AttributeType.VEC4 },
            ],
            {
                'instanceAbsPosition': (inst: IntervalInstance) => [inst.x, inst.y, inst.z],
                'instanceRelPosition': (inst: IntervalInstance) => [inst.relativeX, inst.relativeY],
                'instanceSize': (inst: IntervalInstance) => [inst.w, inst.h, inst.relativeW, inst.relativeH],
                'instanceColor': (inst: IntervalInstance) => inst.color,
            }
        );

        this.transparent = true;
    }

    draw(context: DrawContext) {
        context.uniform1f('minWidth', this.minWidth);
        context.uniform1f('blendFactor', 1.0 - this.additiveBlending);
        context.uniform1f('borderStrength', this.borderStrength);

        context.uniform2f('groupSize', this.computedWidth, this.computedHeight);
        context.uniform1f('groupOpacity', this.opacity);
        context.uniformMatrix4fv('groupModel', false, this.worldTransformMat4);
        context.extDrawInstanced(DrawMode.TRIANGLES, 6, 0, this.instanceCount);
    }

    protected allocateGPUVertexState(
        device: GPUDevice,
        attributeLayout: AttributeLayout,
        instanceVertexAttributes: { [name: string]: VertexAttributeBuffer }
    ) {
        return device.createVertexState({
            indexBuffer: SharedResources.getQuadIndexBuffer(device),
            attributeLayout: attributeLayout,
            attributes: {
                // vertices
                'position': {
                    buffer: SharedResources.getQuad1x1VertexBuffer(device),
                    offsetBytes: 0,
                    strideBytes: 2 * 4,
                },
                ...instanceVertexAttributes
            }
        });
    }

    protected getVertexCode() {
        return `
            #version 100

            precision highp float;

            // for all instances
            attribute vec2 position;
            uniform float minWidth;
            uniform mat4 groupModel;
            uniform vec2 groupSize;

            // per instance attributes
            attribute vec3 instanceAbsPosition;
            attribute vec2 instanceRelPosition;

            attribute vec4 instanceSize;
            attribute vec4 instanceColor;

            varying vec2 vUv;

            varying vec2 size;
            varying vec4 color;

            void main() {
                vUv = position;

                // yz are absolute domPx units, x is in fractions of groupSize
                vec3 pos = vec3(
                    instanceAbsPosition.xy + instanceRelPosition.xy * groupSize.xy,
                    instanceAbsPosition.z
                );

                size = vec2(instanceSize.xy + instanceSize.zw * groupSize.xy);

                // apply a minimum width
                size.x = max(size.x, minWidth);

                color = instanceColor;

                gl_Position = groupModel * vec4(vec3(position * size, 0.0) + pos, 1.0);
            }
        `;
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform float blendFactor;
            uniform float borderStrength;
            uniform float groupOpacity;

            varying vec2 size;
            varying vec4 color;

            varying vec2 vUv;

            void main() {
                vec2 domPx = vUv * size;

                const vec2 borderWidthPx = vec2(1.);

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                
                float border = 1.0 - inner.x * inner.y;

                vec4 c = color;

                c.rgb += border * vec3(borderStrength);
                c.a = mix(c.a, c.a + borderStrength, border);

                gl_FragColor = vec4(c.rgb, blendFactor) * c.a * groupOpacity;
            }
        `;
    }

}

export default IntervalInstances;