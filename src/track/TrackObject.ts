import Animator from "../Animator";
import UsageCache from "engine/ds/UsageCache";
import Rect from "engine/ui/Rect";
import Text from "engine/ui/Text";
import { InternalDataSource } from "../data-source/InternalDataSource";
import { OpenSansRegular } from "../ui/font/Fonts";
import { Tile, TileLoader, TileState } from "./TileLoader";
import { TrackModel } from "./TrackModel";
import { Scalar } from "engine/math/Scalar";
import { StyleProxy } from "../ui/util/StyleProxy";

export class TrackObject<
    ModelType extends TrackModel = TrackModel,
    TileLoaderType extends TileLoader<any, any> = TileLoader<any, any>
> extends Rect {

    protected displayLoadingIndicator = false;

    protected _pixelRatio: number = window.devicePixelRatio || 1;
    get pixelRatio() { return this._pixelRatio; }
    set pixelRatio(v: number) {
        this._pixelRatio = v;
        this.displayNeedUpdate = true;
    }

    protected dataSource: InternalDataSource;
    protected contig: string | undefined;
    protected x0: number;
    protected x1: number;
    
    protected defaultCursor = 'crosshair';

    protected axisPointers: { [id: string]: AxisPointer } = {};
    protected activeAxisPointerColor = [1, 1, 1, 0.8];
    protected secondaryAxisPointerColor = [0.2, 0.2, 0.2, 1];

    protected focusRegionRectLeft: Rect;
    protected focusRegionRectRight: Rect;

    protected loadingIndicator: LoadingIndicator;

    protected displayNeedUpdate = true;
    protected loadingIndicatorPadding = 0.1;

    constructor(protected readonly model: ModelType) {
        super(0, 0);
        
        // set default background color
        this.color = [0.1, 0.1, 0.1, 1];

        this.cursorStyle = this.defaultCursor;
    
        this.addInteractionListener('pointerdown', () => this.cursorStyle = 'pointer');
        this.addInteractionListener('pointerup', () => this.cursorStyle = this.defaultCursor);
        this.addInteractionListener('dragend', () => this.cursorStyle = this.defaultCursor);

        this.loadingIndicator = new LoadingIndicator();
        this.loadingIndicator.cursorStyle = 'pointer';
        this.loadingIndicator.originY = -1;
        this.loadingIndicator.originX = -1;
        this.loadingIndicator.relativeX = 1;
        this.loadingIndicator.relativeY = 1;
        this.loadingIndicator.x = -20;
        this.loadingIndicator.y = -10;
        this.loadingIndicator.mask = this;
        this.add(this.loadingIndicator);
        // @! depth-box, should be at top, maybe relativeZ = 1
        // - be careful to avoid conflict with cursor
        this.toggleLoadingIndicator(false, false);
        
        let focusRegionColor = [.1, .1, .1, 1.0];
        let focusRegionOpacity = 0.7;
        this.focusRegionRectLeft = new Rect(0, 0, focusRegionColor);
        this.focusRegionRectRight = new Rect(0, 0, focusRegionColor);

        this.focusRegionRectLeft.opacity = this.focusRegionRectRight.opacity = focusRegionOpacity;
        this.focusRegionRectLeft.relativeH = this.focusRegionRectRight.relativeH = 1.0;
        this.focusRegionRectLeft.z = this.focusRegionRectRight.z = 1.9;
        this.add(this.focusRegionRectLeft);
        this.add(this.focusRegionRectRight);
        // disabled by default
        this.clearFocusRegion();
    }

    setDataSource(dataSource: InternalDataSource) {
        this.dataSource = dataSource;
        this.displayNeedUpdate = true;
    }

    setContig(contig: string) {
        this.contig = contig;
        this.displayNeedUpdate = true;
    }

    setRange(x0: number, x1: number) {
        this.x0 = x0;
        this.x1 = x1;
        this.displayNeedUpdate = true;
    }

    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle) {
        let withinBounds = fractionX >= 0 && fractionX <= 1;

        let axisPointer = this.axisPointers[id];

        if (axisPointer === undefined) {
            // !withinBounds means do not draw, so we don't need to create the object
            if (!withinBounds) return;
            // create axis pointer
            axisPointer = new AxisPointer(style, this.activeAxisPointerColor, this.secondaryAxisPointerColor, 'x');
            axisPointer.z = 2;
            this.add(axisPointer);
            this.axisPointers[id] = axisPointer;
        }

        axisPointer.render = withinBounds;

        if (withinBounds) {
            axisPointer.relativeX = fractionX;
        }

        if (axisPointer.style !== style) {
            axisPointer.setStyle(style);
        }
    }

    removeAxisPointer(id: string) {
        let axisPointer = this.axisPointers[id];

        if (axisPointer === undefined) {
            return;
        }

        this.remove(axisPointer);
        delete this.axisPointers[id];
    }

    setFocusRegion(x0_fractional: number, x1_fractional: number) {        
        this.focusRegionRectLeft.relativeX = 0;
        this.focusRegionRectLeft.relativeW = Math.max(Math.min(x0_fractional, x1_fractional), 0);
        this.focusRegionRectLeft.render = true;

        this.focusRegionRectRight.relativeX = Math.max(x0_fractional, x1_fractional);
        this.focusRegionRectRight.relativeW = Math.max(1.0 - this.focusRegionRectRight.relativeX, 0);
        this.focusRegionRectRight.render = true;
    }

    clearFocusRegion() {
        this.focusRegionRectLeft.render = false;
        this.focusRegionRectRight.render = false;
    }

    private _lastComputedWidth: number;
    applyTransformToSubNodes(root?: boolean) {
        // update tiles if we need to
        if ((this._lastComputedWidth !== this.getComputedWidth()) || this.displayNeedUpdate) {
            this.triggerDisplayUpdate();
            this._lastComputedWidth = this.getComputedWidth();
        }

        super.applyTransformToSubNodes(root);
    }

    currentSamplingDensity() {
        const span = this.x1 - this.x0;
        const widthPx = this.getComputedWidth();
        let basePairsPerDOMPixel = (span / widthPx);
        let samplingDensity = basePairsPerDOMPixel / this.pixelRatio;
        return samplingDensity;
    }

    applyStyle(styleProxy: StyleProxy) {
        this.color = styleProxy.getColor('background-color');
        this.loadingIndicator.color = styleProxy.getColor('--loading-indicator') || this.loadingIndicator.color;
        this.activeAxisPointerColor = styleProxy.getColor('--cursor') || this.activeAxisPointerColor;
        this.secondaryAxisPointerColor = styleProxy.getColor('--secondary-cursor') || this.secondaryAxisPointerColor;
    }

    /**
     * Override to handle drawing
     */
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
    }

    protected getTileLoader(): TileLoaderType {
        return this.dataSource.getTileLoader(this.model, this.contig) as any;
    }

    protected _loadingTiles = new UsageCache<Tile<any>>(
        null,
        (tile) => this.removeTileLoadingDependency(tile),
    );
    protected triggerDisplayUpdate() {
        this._loadingTiles.markAllUnused();
        this.displayNeedUpdate = false;

        const span = this.x1 - this.x0;
        const widthPx = this.getComputedWidth();
        let samplingDensity = this.currentSamplingDensity();
        let continuousLodLevel = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(continuousLodLevel);

        this.updateDisplay(samplingDensity, continuousLodLevel, span, widthPx);

        // display loading indicator if any tiles in the current range are loading

        let tileLoader = this.getTileLoader();
        let topLod = tileLoader.topTouchedLod();
        let visibleLod = tileLoader.mapLodLevel(lodLevel);

        let _lastMappedLod = -1;
        for (let l = visibleLod; l <= topLod; l++) {
            let mappedLod = tileLoader.mapLodLevel(l);

            if (_lastMappedLod != mappedLod) {
                let lodLevelCovered = true;

                tileLoader.forEachTileAtLod(this.x0, this.x1, mappedLod, false, (tile) => {
                    if (tile.state === TileState.Loading) {
                        this._loadingTiles.get(tile.key, () => this.createTileLoadingDependency(tile));
                    }

                    if (tile.state !== TileState.Complete) {
                        lodLevelCovered = false;
                    }
                });

                // if a level has been covered complete we assume we don't care about the higher lods
                if (lodLevelCovered) break;
            }

            _lastMappedLod = mappedLod;
        }

        this._loadingTiles.removeUnused();

        this.toggleLoadingIndicator((this._loadingTiles.count > 0) || this.displayLoadingIndicator, true);
    }

    /**
     * Show or hide the loading indicator via animation
     * This function can be safely called repeatedly without accounting for the current state of the indicator
     */
    protected toggleLoadingIndicator(visible: boolean, animate: boolean) {
        // we want a little bit of delay before the animation, for this we use a negative opacity when invisible
        let targetOpacity = visible ? 1.0 : -this.loadingIndicatorPadding;

        if (animate) {
            Animator.springTo(this.loadingIndicator, { 'opacity': targetOpacity }, 50);
        } else {
            Animator.stop(this.loadingIndicator, ['opacity']);
            this.loadingIndicator.opacity = targetOpacity;
        }
    }

    // when we're waiting on data from a tile we add a complete listener to update the annotation when the data arrives
    protected createTileLoadingDependency = (tile: Tile<any>) => {
        tile.addEventListener('complete', this.onDependentTileComplete);
        return tile;
    }

    protected removeTileLoadingDependency = (tile: Tile<any>) => {
        tile.removeEventListener('complete', this.onDependentTileComplete);
    }

    protected onDependentTileComplete = () => {
        this.triggerDisplayUpdate();
    }

}

export enum AxisPointerStyle {
    Active = 0,
    Secondary = 1,
}

export class AxisPointer extends Rect {

    readonly style: AxisPointerStyle;

    constructor(style: AxisPointerStyle, readonly activeColor: ArrayLike<number>, readonly secondaryColor: ArrayLike<number>, axis: 'x' | 'y') {
        super(0, 0);

        if (axis === 'y') {
            this.originY = -0.5;
            this.relativeW = 1;
            this.h = 1;
        } else {
            this.originX = -0.5;
            this.relativeH = 1;
            this.w = 1;
        }

        this.transparent = true;

        this.setStyle(style);
    }
    
    setStyle(style: AxisPointerStyle) {
        switch (style) {
            case AxisPointerStyle.Active:
                this.color = this.activeColor;
                break;
            case AxisPointerStyle.Secondary:
                this.color = this.secondaryColor;
                break;
        }

        (this.style as any) = style;
    }

}

class LoadingIndicator extends Text {

    constructor() {
        super(OpenSansRegular, 'Loading', 12, [1, 1, 1, 1]);
    }

}

export default TrackObject;