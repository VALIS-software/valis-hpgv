/*

    AppCanvas
    - Manages frame loop
    - Manages root scene node and coordinate system
    - All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)
    
    - Should split up and move core parts to engine
*/

import * as React from "react";
import GPUDevice from 'engine/rendering/GPUDevice';
import RenderPass from 'engine/rendering/RenderPass';
import Renderer from 'engine/rendering/Renderer';
import Renderable from 'engine/rendering/Renderable';
import SharedResources from 'engine/SharedResources';
import { Object2D, Object2DInternal } from 'engine/ui/Object2D';
import { ReactObject, ReactObjectContainer } from "./ReactObject";
import InteractionEvent, { InteractionEventInternal, InteractionEventMap, WheelInteractionEvent, InteractionEventInit } from "engine/ui/InteractionEvent";

interface Props {
    width: number;
    height: number;
    content: Object2D;
    pixelRatio?: number;
    style?: React.CSSProperties;
    canvasStyle?: React.CSSProperties;
    onWillUnmount?: () => void,
}

interface State {
    reactObjects: Array<ReactObject>
}

/**
 * AppCanvas
 * - root scene node and coordinate system
 * - entry point for canvas rendering
 * - emits user interaction events on scene nodes
 */
export class AppCanvas extends React.Component<Props, State> {

    protected canvas: HTMLCanvasElement;
    protected device: GPUDevice;
    protected renderer: Renderer;
    protected mainRenderPass: RenderPass;
    protected scene: Object2D;

    constructor(props: Props) {
        super(props);

        this.state = {
            reactObjects: []
        }

        this.updateSceneContent();
    }

    componentDidMount() {
        if (this.device != null) {
            console.error('Component mounted twice');
        }

        let glOptions: WebGLContextAttributes = {
            antialias: true,
            stencil: true, // to enable masking on the canvas framebuffer
            alpha: false, // it can be expensive to blend the canvas with the DOM behind, avoid where possible
        }

        let gl = this.canvas.getContext('webgl', glOptions);

        if (gl == null) {
            throw 'WebGL not supported';
        }

        // @! temporary initial GL state for 2D drawing
        // in the future this should be applied to the root 2D node
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);

        this.device = new GPUDevice(gl);
        this.renderer = new Renderer(this.device);

        SharedResources.initialize(this.device);

        this.addInputListeners();

        console.log(`AppCanvas created with device %c"${this.device.name}"`, 'font-weight: bold');
        let vao = this.device.capabilities.vertexArrayObjects;
        let inst = this.device.capabilities.instancing;
        console.log(`\tVertex Array Objects: %c${vao ? 'enabled' : 'disabled'}`, `font-weight: bold; color: ${vao ? 'green' : 'red'}`);
        console.log(`\tInstancing: %c${inst ? 'enabled' : 'disabled'}`, `font-weight: bold; color: ${inst ? 'green' : 'red'}`);

        if (!this.device.capabilities.instancing) {
            // support is expected on 100% of desktops and ~95% of mobile devices
            // a work around is possible to reach the final 5% of mobile devices
            throw 'WebGL extension ANGLE_instanced_arrays is required but not available on this device';
        }
    }

    componentWillUnmount() {
        // for (let node of this.scene)
        this.scene.forEachSubNode((node) => {
            if (node instanceof Renderable) node.releaseGPUResources();
        });

        SharedResources.release();

        this.device = null;
        this.renderer = null;

        this.removeInputListeners();

        if (this.props.onWillUnmount) {
            this.props.onWillUnmount();
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
        if (prevProps.content != this.props.content) {
            this.updateSceneContent();
        }

        if (
            this.props.width !== prevProps.width ||
            this.props.height !== prevProps.height
        ) {
            this.updateSceneTransform();
            this.scene.applyTransformToSubNodes();
            this.renderer.render(this.mainRenderPass);
        }
    }

    render() {
        const pixelRatio = this.props.pixelRatio || window.devicePixelRatio || 1;
        const canvasWidth = this.props.width * pixelRatio + 'px';
        const canvasHeight = this.props.height * pixelRatio + 'px';
        const style : React.CSSProperties = {
            position: 'relative', 
            overflow: 'hidden',
            width: canvasWidth,
            height: canvasHeight,
            ...(this.props.style || {})
        };
        return (
            <div className="app-canvas" style={style}>
                <canvas
                    ref={(v) => this.canvas = v}
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: this.props.width + 'px',
                        height: this.props.height + 'px',
                        zIndex: 0,
                        ...(this.props.canvasStyle || {})
                    }}
                />
                {
                    this.state.reactObjects.map(
                        (ro) => <ReactObjectContainer key={ro.reactUid} reactObject={ro} scene={this.scene} />
                    )
                }
            </div>
        );
    }

    renderCanvas() {
        this.renderer.render(this.mainRenderPass);
        this.updateReactObjects();
    }

    handleUserInteraction() {
        this.handlePointerChanges();
    }

    protected updateSceneContent() {
        this.scene = new Object2D();
        if (this.props.content != null) {
            this.scene.add(this.props.content);
        }
        this.mainRenderPass = new RenderPass(
            null,
            this.scene,
            {
                clearColor: [1, 1, 1, 1],
                clearDepth: 1,
                clearStencil: 0x00
            }
        );
        this.updateSceneTransform();
        this.scene.applyTransformToSubNodes();
    }

    /**
     * Apply DOM pixel coordinate system to the scene via a transform on the root node
     * - Flip z-axis from default OpenGL coordinates so that 1 = in front the screen and -1 is inside the screen
     * - z coordinates clip outside of -1 to 1
     * - (0, 0) corresponds to the top-left of the canvas
     * - (canvas.clientWidth, canvas.clientHeight) corresponds to the bottom left
     */
    protected updateSceneTransform() {
        // width and height should be the _display_ size of the scene in DOM pixel units
        let w_dom = this.props.width;
        let h_dom = this.props.height;
        this.scene.x = -1;
        this.scene.y = 1;
        this.scene.z = 0;
        this.scene.sx = 2 / w_dom;
        this.scene.sy = -2 / h_dom;
        this.scene.sz = -1 * 1 / 5000;
        this.scene.w = w_dom;
        this.scene.h = h_dom;
    }

    /**
     * Given bounds in OpenGL display coordinates (clip-space), return the same bounds in DOM pixel coordinates (relative to the canvas)
     * This applies the inverse of the scene transform
     */
    protected worldToCanvasSpaceBounds(worldSpaceBounds: { l: number, r: number, t: number, b: number }) {
        return {
            l: (worldSpaceBounds.l - this.scene.x) / this.scene.sx,
            r: (worldSpaceBounds.r - this.scene.x) / this.scene.sx,
            t: (worldSpaceBounds.t - this.scene.y) / this.scene.sy,
            b: (worldSpaceBounds.b - this.scene.y) / this.scene.sy,
        }
    }

    /**
     * Converts from canvas-space coordinates into clip-space, which is the world-space of Object2D nodes
     */
    protected canvasToWorldSpacePosition(canvasSpacePosition: { x: number, y: number }) {
        return {
            x: (canvasSpacePosition.x / this.props.width) * 2 - 1,
            y: -((canvasSpacePosition.y / this.props.height) * 2 - 1),
        }
    }

    private _reactObjects = new Array<ReactObject>();
    protected updateReactObjects() {
        // find all react nodes in the scene
        let reactObjectIndex = 0;
        let reactObjectsChanged = false;

        // for (let node of this.scene)
        this.scene.forEachSubNode((node) => {
            if (node instanceof ReactObject) {
                let last = this._reactObjects[reactObjectIndex];

                if (!reactObjectsChanged) {
                    reactObjectsChanged = last !== node;
                }

                this._reactObjects[reactObjectIndex] = node;

                reactObjectIndex++;
            }
        });

        reactObjectsChanged = reactObjectsChanged || (reactObjectIndex !== this._reactObjects.length);

        // trim excess nodes from the previous frame
        if (reactObjectIndex < this._reactObjects.length) {
            this._reactObjects.length = reactObjectIndex;
        }

        // trigger react re-render of viewer if the node list has changed
        if (reactObjectsChanged) {
            this.setState({
                reactObjects: this._reactObjects
            });
        }
    }

    /**
     * Returns the event position relative to the canvas
     */
    protected mouseEventToCanvasSpacePosition(e: MouseEvent) {
        let x: number = 0;
        let y: number = 0;

        let canvasRect = this.canvas.getBoundingClientRect();
        let canvasX = window.scrollX + this.canvas.clientLeft;
        let canvasY = window.scrollY + canvasRect.top;
        x = e.pageX - canvasX;
        y = e.pageY - canvasY;

        return {
            x: x,
            y: y,
        }
    }

    protected pointerEventSupport = 'PointerEvent' in (window as any);

    protected addInputListeners() {
        if (this.pointerEventSupport) {
            this.canvas.addEventListener('pointerdown', this.onPointerDown);
            window.addEventListener('pointerup', this.onPointerUp);
            window.addEventListener('pointermove', this.onPointerMove);
            window.addEventListener('pointerenter', this.onPointerEnter);
            window.addEventListener('pointerleave', this.onPointerLeave);
        } else {
            this.canvas.addEventListener('mousedown', this.onPointerDown);
            window.addEventListener('mouseup', this.onPointerUp);
            window.addEventListener('mousemove', this.onPointerMove);
            window.addEventListener('mouseenter', this.onPointerEnter);
            window.addEventListener('mouseleave', this.onPointerLeave);
        }
        this.canvas.addEventListener('click', this.onClick);
        this.canvas.addEventListener('dblclick', this.onDoubleClick);
        this.canvas.addEventListener('wheel', this.onWheel, { passive: false } as any);
    }

    protected removeInputListeners() {
        if (this.pointerEventSupport) {
            this.canvas.removeEventListener('pointerdown', this.onPointerDown);
            window.removeEventListener('pointerup', this.onPointerUp);
            window.removeEventListener('pointermove', this.onPointerMove);
            window.removeEventListener('pointerenter', this.onPointerEnter);
            window.removeEventListener('pointerleave', this.onPointerLeave);
        } else {
            this.canvas.removeEventListener('mousedown', this.onPointerDown);
            window.removeEventListener('mouseup', this.onPointerUp);
            window.removeEventListener('mousemove', this.onPointerMove);
            window.removeEventListener('mouseenter', this.onPointerEnter);
            window.removeEventListener('mouseleave', this.onPointerLeave);
        }
        this.canvas.removeEventListener('click', this.onClick);
        this.canvas.removeEventListener('dblclick', this.onDoubleClick);
        this.canvas.removeEventListener('wheel', this.onWheel, {passive: false} as any);
    }

    private dragData: {
        [pointerId: number]: {
            button: number,
            activeNodes: Array<Object2D>,
            inactiveNodes: Array<Object2D>
        }
    } = {};

    // we use the root node of the document to set the cursor style because it lets us maintain the cursor when dragging beyond the canvas
    protected readonly cursorTarget = window.document.documentElement;
    protected activePointers: {
        [ pointerId: number ]: {
            interactionData: InteractionEventInit,
            sourceEvent: MouseEvent | PointerEvent,
            lastHitNodes: Set<Object2D>
        }
    } = {};

    private _cursorStyle: string = '';

    protected resetCursor() {
        this._cursorStyle = null;
    }

    protected applyCursor() {
        let newStyle = this._cursorStyle === null ? '' : this._cursorStyle;
        if (this.cursorTarget.style.cursor !== newStyle) {
            this.cursorTarget.style.setProperty('cursor', newStyle, 'important');
        }
    }

    private _lastActivePointers: AppCanvas['activePointers'];

    protected handlePointerChanges() {
        // fire pointerleave for any pointers that are no longer active in this frame
        for (let pointerId in this._lastActivePointers) {
            let inactivePointer = this._lastActivePointers[pointerId];
            if (this.activePointers[pointerId] === undefined) {
                // pointer became inactive, fire 'pointerleave' on all nodes it was hitting 
                this.executePointerInteraction(inactivePointer.lastHitNodes, 'pointerleave', inactivePointer.interactionData, (init) => new InteractionEvent(init, inactivePointer.sourceEvent));
            }
        }

        // reset lastActivePointers and fill in from active pointers
        this._lastActivePointers = {};

        // for all registered pointers:
        for (let pointerId in this.activePointers) {
            let activePointer = this.activePointers[pointerId];
            let { interactionData, lastHitNodes, sourceEvent } = activePointer;

            let hitNodes = this.hitTestNodesForInteraction(
                [
                    'pointerenter',
                    'pointerleave'
                ],
                interactionData.worldX,
                interactionData.worldY
            );

            this._lastActivePointers[pointerId] = activePointer;

            // early exit
            if (hitNodes.length === 0 && lastHitNodes.size === 0) {
                continue;
            }

            // find delta since last call
            let addedNodes = new Set();
            let removedNodes = new Set();

            for (let node of hitNodes) {
                if (!lastHitNodes.has(node)) {
                    addedNodes.add(node);
                    lastHitNodes.add(node);
                }
            }

            for (let node of lastHitNodes) {
                if (hitNodes.indexOf(node) === -1) {
                    removedNodes.add(node);
                    lastHitNodes.delete(node);
                }
            }

            let totalNodeChange = addedNodes.size + removedNodes.size;

            // early exit
            if (totalNodeChange === 0) continue;

            this.executePointerInteraction(addedNodes, 'pointerenter', interactionData, (init) => new InteractionEvent(init, sourceEvent));
            this.executePointerInteraction(removedNodes, 'pointerleave', interactionData, (init) => new InteractionEvent(init, sourceEvent));
        }
    }

    protected onPointerEnter = (e: MouseEvent | PointerEvent) => {
        // enter and leave are special cases in that they don't directly translate into our InteractionEvents
        // we need a special system to handle these
        let interactionData = this.interactionDataFromEvent(e);
        this.activePointers[interactionData.pointerId] = {
            interactionData: interactionData,
            sourceEvent: e,
            lastHitNodes: new Set()
        }
        this.handlePointerChanges();
    }

    protected onPointerLeave = (e: MouseEvent | PointerEvent) => {
        let interactionData = this.interactionDataFromEvent(e);
        delete this.activePointers[interactionData.pointerId];
        this.handlePointerChanges();
    }

    protected onPointerMove = (e: MouseEvent | PointerEvent) => {
        this.resetCursor();

        let interactionData = this.interactionDataFromEvent(e);
        interactionData.buttonChange = -1; // normalize between MouseEvent and PointerEvent

        // update pointer data in activePointers
        if (e.target === this.canvas) {
            // pointer moving directly over the canvas; ensure this pointer is considered an active pointer
            if (this.activePointers[interactionData.pointerId] === undefined) {
                this.activePointers[interactionData.pointerId] = {
                    interactionData: interactionData,
                    sourceEvent: e,
                    lastHitNodes: new Set()
                }
            } else {
                this.activePointers[interactionData.pointerId].interactionData = interactionData;
            }
        } else {
            // pointer not directly over the canvas another DOM element may be overlaying
            // this is no longer an active pointer
            delete this.activePointers[interactionData.pointerId];
        }

        let dragData = this.dragData[interactionData.pointerId];

        let defaultPrevented = false;
        if (dragData !== undefined) {
            defaultPrevented = defaultPrevented || this.executePointerInteraction(dragData.inactiveNodes, 'dragstart', interactionData, (init) => {
                dragData.activeNodes.push(init.target);
                return new InteractionEvent(init, e);
            });
            dragData.inactiveNodes = [];

            defaultPrevented = defaultPrevented || this.executePointerInteraction(dragData.activeNodes, 'dragmove', interactionData, (init) => {
                return new InteractionEvent(init, e);
            });
        }

        if (e.target === this.canvas) {
            if (!defaultPrevented) {
                let eventName: keyof InteractionEventMap = 'pointermove';
                let hitNodes = this.hitTestNodesForInteraction([eventName], interactionData.worldX, interactionData.worldY);
                this.executePointerInteraction(hitNodes, eventName, interactionData, (init) => {
                    return new InteractionEvent(init, e);
                });
            } 
        }

        this.applyCursor();
        this.handlePointerChanges();
    }

    protected onPointerDown = (e: MouseEvent | PointerEvent) => {
        this.resetCursor();

        if (e.target === this.canvas) {
            let eventName: keyof InteractionEventMap = 'pointerdown';
            let interactionData = this.interactionDataFromEvent(e);

            // initialize drag data entry
            let dragData = this.dragData[interactionData.pointerId] = {
                activeNodes: new Array<Object2D>(),
                inactiveNodes: new Array<Object2D>(),
                button: e.button,
            };

            // we need collect drag event nodes as well as pointerdown receiver to make sure drag events are emitted
            let hitNodes = this.hitTestNodesForInteraction([eventName, 'dragstart', 'dragmove', 'dragend'], interactionData.worldX, interactionData.worldY).slice();
            this.executePointerInteraction(
                hitNodes,
                eventName,
                interactionData,
                (init) => {
                    if (dragData.inactiveNodes.indexOf(init.target) === -1) {
                        dragData.inactiveNodes.push(init.target);
                    }
                    return new InteractionEvent(init, e);
                }
            );
        }

        this.applyCursor();
    }

    protected onPointerUp = (e: MouseEvent | PointerEvent) => {
        this.resetCursor();

        let interactionData = this.interactionDataFromEvent(e);

        let dragData = this.dragData[interactionData.pointerId];
        let defaultPrevented = false;
        if (dragData !== undefined && dragData.button === e.button) {
            // clear drag data entry
            delete this.dragData[interactionData.pointerId];
            // fire 'dragend' on any nodes where drag was started
            defaultPrevented = this.executePointerInteraction(dragData.activeNodes, 'dragend', interactionData, (init) => new InteractionEvent(init, e), false);
        }

        if (e.target === this.canvas) {
            if (!defaultPrevented){
                let eventName: keyof InteractionEventMap = 'pointerup';
                let hitNodes = this.hitTestNodesForInteraction([eventName], interactionData.worldX, interactionData.worldY);
                this.executePointerInteraction(hitNodes, eventName, interactionData, (init) => new InteractionEvent(init, e));
            }
        }

        this.applyCursor();
    }

    protected onClick = (e: MouseEvent) => {
        if (e.target === this.canvas) {
            let eventName: keyof InteractionEventMap = 'click';
            let interactionData = this.interactionDataFromEvent(e);
            let hitNodes = this.hitTestNodesForInteraction([eventName], interactionData.worldX, interactionData.worldY);
            this.executePointerInteraction(hitNodes, eventName, interactionData, (init) => new InteractionEvent(init, e));
        }
    }

    protected onDoubleClick = (e: MouseEvent) => {
        if (e.target === this.canvas) {    
            let eventName: keyof InteractionEventMap = 'dblclick';
            let interactionData = this.interactionDataFromEvent(e);
            let hitNodes = this.hitTestNodesForInteraction([eventName], interactionData.worldX, interactionData.worldY);
            this.executePointerInteraction(hitNodes, eventName, interactionData, (init) => new InteractionEvent(init, e));
        }
    }

    protected onWheel = (e: WheelEvent) => {
        if (e.target === this.canvas) {
            let eventName: keyof InteractionEventMap = 'wheel';
            let interactionData = this.interactionDataFromEvent(e);
            let hitNodes = this.hitTestNodesForInteraction([eventName], interactionData.worldX, interactionData.worldY);
            this.executePointerInteraction(
                hitNodes,
                eventName,
                interactionData,
                (init) => {
                    return new WheelInteractionEvent({
                        ...init,
                        wheelDeltaMode: e.deltaMode,
                        wheelDeltaX: e.deltaX,
                        wheelDeltaY: e.deltaY,
                        wheelDeltaZ: e.deltaZ,
                    }, e);
                }
            );
        }
    }

    private _hitNodes = new Array<Object2D>(); // micro-optimization: reuse array between events to prevent re-allocation
    protected hitTestNodesForInteraction<K extends keyof InteractionEventMap>(interactionEventNames: Array<K>, worldX: number, worldY: number): Array<Object2D> {
        let hitNodeIndex = 0;
        let hitNodes = this._hitNodes;

        this.scene.forEachSubNode((node) => {
            if (node instanceof Object2D) {
                let nodeInternal = node as any as Object2DInternal;

                // we can skip this node if we know it doesn't have any interaction behaviors
                let listeners = 0;
                for (let name of interactionEventNames) {
                    listeners += nodeInternal.interactionEventListenerCount[name];
                }

                if (
                    node.cursorStyle == null &&
                    listeners <= 0
                ) return;

                let worldSpaceBounds = node.getWorldBounds();

                // hit-test position with object bounds
                if (
                    worldX >= worldSpaceBounds.l &&
                    worldX <= worldSpaceBounds.r &&
                    worldY >= worldSpaceBounds.b &&
                    worldY <= worldSpaceBounds.t
                ) {
                    hitNodes[hitNodeIndex++] = node;
                }
            }
        });

        // trim excess elements from last use
        if (hitNodeIndex < hitNodes.length) {
            hitNodes.length = hitNodeIndex;
        }

        // top-most nodes should receive events first
        hitNodes.sort(this.compareZ);

        return hitNodes;
    }

    protected executePointerInteraction<K extends keyof InteractionEventMap>(
        nodes: Iterable<Object2D>,
        interactionEventName: K,
        interactionData: InteractionEventInit,
        constructEvent: (init: InteractionEventInit) => InteractionEventMap[K],
        setCursor = true
    ) {
        let defaultPrevented = false;

        for (let node of nodes) {
            let nodeInternal = node as any as Object2DInternal;

            let worldSpaceBounds = node.getWorldBounds();
            let fx = (interactionData.worldX - worldSpaceBounds.l) / (worldSpaceBounds.r - worldSpaceBounds.l);
            let fy = (interactionData.worldY - worldSpaceBounds.t) / (worldSpaceBounds.b - worldSpaceBounds.t);

            // populate node-specific event fields
            interactionData.target = node;
            interactionData.localX = fx * nodeInternal.computedWidth;
            interactionData.localY = fy * nodeInternal.computedHeight;
            interactionData.fractionX = fx;
            interactionData.fractionY = fy;

            let eventObject = constructEvent(interactionData);
            let eventObjectInternal = eventObject as any as InteractionEventInternal;

            // trigger event on node
            nodeInternal.eventEmitter.emit(interactionEventName, eventObject);

            // update cursor style
            if (setCursor && this._cursorStyle == null && node.cursorStyle != null) {
                this._cursorStyle = node.cursorStyle;
            }

            defaultPrevented = eventObjectInternal.defaultPrevented || defaultPrevented;
            // if user has executed stopPropagation() then do not emit on subsequent nodes
            if (eventObjectInternal.propagationStopped) break;
        }

        return defaultPrevented;
    }

    protected interactionDataFromEvent(e: MouseEvent | PointerEvent) {
        let canvasSpacePosition = this.mouseEventToCanvasSpacePosition(e);
        let worldSpacePosition = this.canvasToWorldSpacePosition(canvasSpacePosition);

        let interactionData: InteractionEventInit = {
            buttonChange: e.button,
            buttonState: e.buttons,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            canvasX: canvasSpacePosition.x,
            canvasY: canvasSpacePosition.y,
            worldX: worldSpacePosition.x,
            worldY: worldSpacePosition.y,

            // PointerEvent data, defaults to mouse events
            pointerId: -1, // -1 is chosen for mouse events to avoid any possible conflict with other pointers
            pointerType: 'mouse',
            isPrimary: true,
            width: 1,
            height: 1,
            pressure: 0,
            tiltX: 0,
            tiltY: 0,

            // node-specific
            target: null,
            localX: 0,
            localY: 0,
            fractionX: 0,
            fractionY: 0,
        }

        // set pointer event data if it's available
        if (this.pointerEventSupport && e instanceof PointerEvent) {
            interactionData.pointerId = e.pointerId;
            interactionData.pointerType = e.pointerType as any;
            interactionData.isPrimary = e.isPrimary;
            interactionData.width = e.width;
            interactionData.height = e.height;
            interactionData.pressure = e.pressure;
            interactionData.tiltX = e.tiltX;
            interactionData.tiltY = e.tiltY;
        }

        return interactionData;
    }

    protected compareZ(a: Object2D, b: Object2D) {
        return a.getWorldZ() - b.getWorldZ();
    }

}

export default AppCanvas;