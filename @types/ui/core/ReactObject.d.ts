import Object2D from "engine/ui/Object2D";
import * as React from "react";
export declare class ReactObject extends Object2D {
    reactUid: number;
    content: React.ReactNode;
    containerStyle: React.CSSProperties;
    protected _content: React.ReactNode;
    protected _containerStyle: React.CSSProperties;
    constructor(content?: React.ReactNode, w?: number, h?: number);
    addSetContentListener(listener: (content: React.ReactNode) => void): void;
    removeSetContentListener(listener: (...args: Array<any>) => void): void;
    addWorldTransformUpdatedListener(listener: (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => void): void;
    removeWorldTransformUpdatedListener(listener: (...args: Array<any>) => void): void;
    applyWorldTransform(transform: Float32Array | null): void;
    static uidCounter: number;
}
export declare class ReactObjectContainer extends React.Component<{
    reactObject: ReactObject;
    scene: Object2D;
}, {
    content: React.ReactNode;
    worldTransform: Float32Array;
    computedWidth: number;
    computedHeight: number;
    style: React.CSSProperties;
}> {
    constructor(props: {
        reactObject: ReactObject;
        scene: Object2D;
    });
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): JSX.Element;
    protected updateTransformState: (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => void;
    protected updateContentState: (content: React.ReactNode) => void;
}
export default ReactObject;
