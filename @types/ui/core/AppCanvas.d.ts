import GPUDevice from 'engine/rendering/GPUDevice';
import Renderer from 'engine/rendering/Renderer';
import RenderPass from 'engine/rendering/RenderPass';
import { InteractionEventInit, InteractionEventMap } from "engine/ui/InteractionEvent";
import { Object2D } from 'engine/ui/Object2D';
import * as React from "react";
import { ReactObject } from "./ReactObject";
interface Props {
    width: number;
    height: number;
    content: Object2D;
    pixelRatio?: number;
    className?: string;
    style?: React.CSSProperties;
    canvasStyle?: React.CSSProperties;
    onWillUnmount?: () => void;
}
interface State {
    reactObjects: Array<ReactObject>;
}
/**
 * AppCanvas
 * - root scene node and coordinate system
 * - entry point for canvas rendering
 * - emits user interaction events on scene nodes
 */
export declare class AppCanvas extends React.Component<Props, State> {
    protected canvas: HTMLCanvasElement;
    protected device: GPUDevice;
    protected renderer: Renderer;
    protected mainRenderPass: RenderPass;
    protected scene: Object2D;
    constructor(props: Props);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: Props, prevState: State, snapshot: any): void;
    render(): JSX.Element;
    renderCanvas(): void;
    handleUserInteraction(): void;
    protected updateSceneContent(): void;
    /**
     * Apply DOM pixel coordinate system to the scene via a transform on the root node
     * - Flip z-axis from default OpenGL coordinates so that 1 = in front the screen and -1 is inside the screen
     * - z coordinates clip outside of -1 to 1
     * - (0, 0) corresponds to the top-left of the canvas
     * - (canvas.clientWidth, canvas.clientHeight) corresponds to the bottom left
     */
    protected updateSceneTransform(): void;
    /**
     * Given bounds in OpenGL display coordinates (clip-space), return the same bounds in DOM pixel coordinates (relative to the canvas)
     * This applies the inverse of the scene transform
     */
    protected worldToCanvasSpaceBounds(worldSpaceBounds: {
        l: number;
        r: number;
        t: number;
        b: number;
    }): {
        l: number;
        r: number;
        t: number;
        b: number;
    };
    /**
     * Converts from canvas-space coordinates into clip-space, which is the world-space of Object2D nodes
     */
    protected canvasToWorldSpacePosition(canvasSpacePosition: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    private _reactObjects;
    protected updateReactObjects(): void;
    /**
     * Returns the event position relative to the canvas
     */
    protected mouseEventToCanvasSpacePosition(e: MouseEvent): {
        x: number;
        y: number;
    };
    protected pointerEventSupport: boolean;
    protected addInputListeners(): void;
    protected removeInputListeners(): void;
    private dragData;
    protected readonly cursorTarget: HTMLElement;
    protected activePointers: {
        [pointerId: number]: {
            interactionData: InteractionEventInit;
            sourceEvent: MouseEvent | PointerEvent;
            lastHitNodes: Set<Object2D>;
        };
    };
    private _cursorStyle;
    protected resetCursor(): void;
    protected applyCursor(): void;
    private _lastActivePointers;
    protected handlePointerChanges(): void;
    protected onPointerEnter: (e: MouseEvent | PointerEvent) => void;
    protected onPointerLeave: (e: MouseEvent | PointerEvent) => void;
    protected onPointerMove: (e: MouseEvent | PointerEvent) => void;
    protected onPointerDown: (e: MouseEvent | PointerEvent) => void;
    protected onPointerUp: (e: MouseEvent | PointerEvent) => void;
    protected onClick: (e: MouseEvent) => void;
    protected onDoubleClick: (e: MouseEvent) => void;
    protected onWheel: (e: WheelEvent) => void;
    private _hitNodes;
    protected hitTestNodesForInteraction<K extends keyof InteractionEventMap>(interactionEventNames: Array<K>, worldX: number, worldY: number): Array<Object2D>;
    protected executePointerInteraction<K extends keyof InteractionEventMap>(nodes: Iterable<Object2D>, interactionEventName: K, interactionData: InteractionEventInit, constructEvent: (init: InteractionEventInit) => InteractionEventMap[K], setCursor?: boolean): boolean;
    protected interactionDataFromEvent(e: MouseEvent | PointerEvent): InteractionEventInit;
    protected compareZ(a: Object2D, b: Object2D): number;
}
export default AppCanvas;
