import GPUDevice from "engine/rendering/GPUDevice";
import { DrawContext } from "engine/rendering/Renderer";
import Object2D from "engine/ui/Object2D";
import { Text } from "engine/ui/Text";
/**
 * If we're repeating the same text a lot we can improve performance by having a single text instance and re-rendering it at different locations
 *
 * **The original text instance is modified an should not be rendered on its own after using in a TextClone**
 */
export declare class TextClone extends Object2D {
    readonly text: Text;
    color: Array<number>;
    additiveBlending: number;
    _w: number;
    _h: number;
    render: boolean;
    constructor(text: Text, color?: Array<number>);
    onAdded(): void;
    onRemoved(): void;
    allocateGPUResources(device: GPUDevice): void;
    releaseGPUResources(): void;
    draw(context: DrawContext): void;
    protected glyphLayoutChanged: () => void;
}
export default TextClone;
