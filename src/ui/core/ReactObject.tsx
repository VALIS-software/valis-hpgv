import Object2D, { Object2DInternal } from "engine/ui/Object2D";
import * as React from "react";

export class ReactObject extends Object2D {

    reactUid: number;
    set content(n: React.ReactNode) { this._content = n; this.eventEmitter.emit('setContent', n); };
    get content() { return this._content; };
    
    set containerStyle(style: React.CSSProperties) { this._containerStyle = style; this.eventEmitter.emit('setContent', this._content); };
    get containerStyle() { return this._containerStyle; };

    protected _content: React.ReactNode;
    protected _containerStyle: React.CSSProperties;

    constructor(content?: React.ReactNode, w?: number, h?: number) {
        super();
        this.render = false;
        this.reactUid = ReactObject.uidCounter++;
        this._content = content;
        if (w != null) this.w = w;
        if (h != null) this.h = h;
    }
    
    addSetContentListener(listener: (content: React.ReactNode) => void) {
        this.eventEmitter.addListener('setContent', listener);
    }

    removeSetContentListener(listener: (...args: Array<any>) => void) {
        this.eventEmitter.removeListener('setContent', listener);
    }

    addWorldTransformUpdatedListener(listener: (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => void) {
        this.eventEmitter.addListener('worldTransformUpdated', listener);
    }

    removeWorldTransformUpdatedListener(listener: (...args: Array<any>) => void) {
        this.eventEmitter.removeListener('worldTransformUpdated', listener);
    }

    applyWorldTransform(transform: Float32Array | null) {
        super.applyWorldTransform(transform);
        this.eventEmitter.emit('worldTransformUpdated', this.worldTransformMat4, this.computedWidth, this.computedHeight);
    }

    static uidCounter = 0;

}

export class ReactObjectContainer extends React.Component<{
    reactObject: ReactObject,
    scene: Object2D
}, {
        content: React.ReactNode,
        worldTransform: Float32Array,
        computedWidth: number,
        computedHeight: number,
        style: React.CSSProperties,
    }> {

    constructor(props: {
        reactObject: ReactObject,
        scene: Object2D
    }) {
        super(props);

        let reactObjectInternal = props.reactObject as any as Object2DInternal;

        this.state = {
            content: props.reactObject.content,
            worldTransform: reactObjectInternal.worldTransformMat4,
            computedWidth: reactObjectInternal.computedWidth,
            computedHeight: reactObjectInternal.computedHeight,
            style: props.reactObject.containerStyle,
        }        
    }

    componentDidMount() {
        this.props.reactObject.addWorldTransformUpdatedListener(this.updateTransformState);
        this.props.reactObject.addSetContentListener(this.updateContentState);
    }

    componentWillUnmount() {
        this.props.reactObject.removeWorldTransformUpdatedListener(this.updateTransformState);
        this.props.reactObject.removeSetContentListener(this.updateContentState);
    }

    render() {
        let scene = this.props.scene;
        let w = this.state.worldTransform;

        // apply inverse scene transform to convert clips-space world coordinates to DOM pixels
        let x = (w[12] - scene.x) / scene.sx;
        let y = (w[13] - scene.y) / scene.sy;
        let z = (w[14] - scene.z) / scene.sz;
        let sx = w[0] / scene.sx;
        let sy = w[5] / scene.sy;
        let sz = w[10] / scene.sz;

        return <div
            className="react-object-container"
            style={{
                ...this.state.style,
                position: 'absolute',
                transform: `matrix3d(
                    ${sx} , 0     , 0     , 0 ,
                    0     , ${sy} , 0     , 0 ,
                    0     , 0     , ${sz} , 0 ,
                    ${x}  , ${y}  , ${z}  , 1
                )`,
                width: this.state.computedWidth,
                height: this.state.computedHeight,
                // willChange: 'transform, width, height',
            }}
        >
            {this.state.content}
        </div>
    }

    protected updateTransformState = (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => {
        this.setState({
            worldTransform: worldTransform,
            computedWidth: computedWidth,
            computedHeight: computedHeight
        });
    }

    protected updateContentState = (content: React.ReactNode) => {
        this.setState({
            content: content
        });
    }

}

export default ReactObject;