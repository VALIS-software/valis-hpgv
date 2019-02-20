import { CSSUtil } from "./CSSUtil";

/**
 * Some elements are not rendered via the DOM but we'd still like to style them with CSS.
 * To enable this we have 'proxy' DOM elements to hold the CSS styles for these elements.
 * This class makes it easier to use proxy elements by enabling callbacks to be executed when inline styles change.
 */
type ProxyObserver = {
    selector?: string,
    callback: (node: Node, style: CSSStyleDeclaration) => void,
    observer: MutationObserver,
}

export class StyleProxy {

    protected root: HTMLElement = null;
    protected observers = new Set<ProxyObserver>();

    constructor(root: HTMLElement) {
        this.root = root;
    }

    setRoot(root: HTMLElement) {
        if (this.root == root) return;

        this.root = root;
        this.updateObservers();
    }

    getRoot() {
        return this.root;
    }

    getStyle(selector?: string): CSSStyleDeclaration | null {
        let node = selector == null ? this.root : this.root.querySelector(selector);
        if (node instanceof Element) {
            return window.getComputedStyle(node);
        } else {
            return null;
        }
    }

    getColor(propertyName: string, selector?: string) {
        let css = this.getStyle(selector);
        if (css != null) {
            let valueString = css.getPropertyValue(propertyName);
            return valueString === '' ? null : CSSUtil.parseColor(css.getPropertyValue(propertyName));
        } else {
            return null;
        }
    }

    getNumber(propertyName: string, selector?: string) {
        let css = this.getStyle(selector);
        if (css != null) {
            return parseFloat(css.getPropertyValue(propertyName));
        } else {
            return null;
        }
    }

    observeAllStyle(callback: (node: Node, style: CSSStyleDeclaration) => void) {
        return this.createMutationObserver(null, callback);
    }

    observeDescendantStyle(selector: string, callback: (node: Node, style: CSSStyleDeclaration) => void) {
        return this.createMutationObserver(selector, callback);
    }

    removeObserver(observer: MutationObserver) {
        for (let item of this.observers) {
            if (item.observer === observer) {
                item.observer.disconnect();
                this.observers.delete(item);
                return true;
            }
        }

        return false;
    }

    removeAllObservers() {
        for (let item of this.observers) {
            item.observer.disconnect();
        }

        this.observers = new Set();
    }

    protected createMutationObserver(selector: string | null, callback: ProxyObserver['callback']) {
        let observer = new MutationObserver(function (mutations) {
            mutations.forEach((mutationRecord) => {
                callback(mutationRecord.target, window.getComputedStyle(mutationRecord.target as HTMLElement));
            });
        });

        let proxyObserver = {
            selector: selector,
            callback: callback,
            observer: observer,
        };

        this.observers.add(proxyObserver);

        if (this.root != null) {
            this.applyProxyObserver(proxyObserver);
        }

        return observer;
    }

    protected updateObservers() {
        if (this.root == null) return;
        for(let item of this.observers) {
            item.observer.disconnect();
            this.applyProxyObserver(item);
        }
    }

    protected applyProxyObserver(proxyObserver: ProxyObserver) {
        
        let targets: ArrayLike<Node>;

        if (proxyObserver.selector == null) { // observe all
            targets = [this.root].concat(Array.prototype.slice.call(this.root.querySelectorAll('*')));
        } else {
            targets = this.root.querySelectorAll(proxyObserver.selector);
        }

        for (let i = 0; i < targets.length; i++) {
            let target = targets[i];
            
            if (target instanceof HTMLElement) {
                proxyObserver.observer.observe(target, { attributes: true, attributeFilter: ['style'] });
            }
        }
    }

}