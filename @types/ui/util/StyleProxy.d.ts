/**
 * Some elements are not rendered via the DOM but we'd still like to style them with CSS.
 * To enable this we have 'proxy' DOM elements to hold the CSS styles for these elements.
 * This class makes it easier to use proxy elements by enabling callbacks to be executed when inline styles change.
 */
declare type ProxyObserver = {
    selector?: string;
    callback: (node: Node, style: CSSStyleDeclaration) => void;
    observer: MutationObserver;
};
export declare class StyleProxy {
    protected root: HTMLElement;
    protected observers: Set<ProxyObserver>;
    constructor(root: HTMLElement);
    setRoot(root: HTMLElement): void;
    getRoot(): HTMLElement;
    getStyle(selector?: string): CSSStyleDeclaration | null;
    getColor(propertyName: string, selector?: string): number[];
    getNumber(propertyName: string, selector?: string): number;
    observeAllStyle(callback: (node: Node, style: CSSStyleDeclaration) => void): MutationObserver;
    observeDescendantStyle(selector: string, callback: (node: Node, style: CSSStyleDeclaration) => void): MutationObserver;
    removeObserver(observer: MutationObserver): boolean;
    removeAllObservers(): void;
    protected createMutationObserver(selector: string | null, callback: ProxyObserver['callback']): MutationObserver;
    protected updateObservers(): void;
    protected applyProxyObserver(proxyObserver: ProxyObserver): void;
}
export {};
