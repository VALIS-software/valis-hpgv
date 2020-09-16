import * as React from "react";
import { IDataSource } from "./data-source/IDataSource";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { GenomeVisualizerConfiguration } from "./GenomeVisualizerConfiguration";
import { TrackModel } from "./track/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import { TrackViewer, Track } from "./ui/TrackViewer";
import { TileLoader } from "./track/TileLoader";
import { TrackObject } from "./track/TrackObject";
import { GenomicLocation, Contig } from "./model";
import { Panel } from "./ui";
export interface GenomeVisualizerRenderProps {
    width: number;
    height: number;
    pixelRatio?: number;
    style?: React.CSSProperties;
    highlightLocation?: string;
}
interface CustomTileLoader<ModelType> {
    new (dataSource: IDataSource, model: ModelType, contig: string, ...args: Array<any>): TileLoader<any, any>;
    cacheKey(model: ModelType): string | null;
    getAvailableContigs(model: ModelType): Promise<Array<Contig>>;
}
interface CustomTrackObject {
    new (model: TrackModel): TrackObject<TrackModel, any>;
    getDefaultHeightPx?: (model: TrackModel) => number;
    getExpandable?: (model: TrackModel) => boolean;
    styleNodes?: React.ReactNode;
}
export declare class GenomeVisualizer {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;
    constructor(configuration?: GenomeVisualizerConfiguration, dataSource?: IDataSource | string);
    setDataSource(dataSourceArg: IDataSource | string | undefined): void;
    setConfiguration(configuration: GenomeVisualizerConfiguration): void;
    getConfiguration(): import("./ui/TrackViewerConfiguration").TrackViewerConfiguration;
    /**
     * Sets the current displayed genomic location (contig, region) of the first open panel
     * @param genomicLocation `{contig: string, x0: number, x1: number}`
     */
    setLocation(genomicLocation: GenomicLocation): void;
    /**
     * Sets the current displayed contig of the first open panel
     * Use with `setRange()` to specify a complete location
     * @param contig id of contig within available data
     */
    setContig(contig: string): void;
    /**
     * Sets the current displayed region of the first open panel
     * Spanned length = x1 - x0
     * @param x0 left base index (starting at 0)
     * @param x1 right base index
     */
    setRange(x0: number, x1: number): void;
    addTrack(model: TrackModel, animateIn: boolean, highlightLocation: string): Track;
    addTrackFromFilePath(path: string, name?: string, animateIn?: boolean, highlightLocation?: string): Track;
    addPanel(location: GenomicLocation, animateIn: boolean): void;
    closeTrack(track: Track, animateOut?: boolean, onComplete?: () => void): void;
    closePanel(panel: Panel, animateOut: boolean, onComplete?: () => void): void;
    setTrackIndex(track: Track, index: number, animate?: boolean): void;
    moveTrackUp(track: Track, animate?: boolean): void;
    moveTrackDown(track: Track, animate?: boolean): void;
    getTracks(): Track[];
    getPanels(): Panel[];
    clearCaches(): void;
    addEventListener(event: string, listener: (...args: any[]) => void): void;
    removeEventListener(event: string, listener: (...args: any[]) => void): void;
    getContentHeight(): number;
    render(props: GenomeVisualizerRenderProps, container: HTMLElement): void;
    reactRender(props?: GenomeVisualizerRenderProps): JSX.Element;
    /**
     * This method will update non-dom elements relying on CSS.
     * Useful to call after the CSS changes, however, if the inline style on style proxy node changes then the update will happen automatically.
     */
    refreshStyle(): void;
    private _frameLoopHandle;
    protected startFrameLoop(): void;
    protected stopFrameLoop(): void;
    protected frameLoop: () => void;
    static registerTrackType<ModelType extends TrackModel>(type: ModelType['type'], tileLoaderClass: CustomTileLoader<ModelType>, trackObjectClass: CustomTrackObject): void;
    static getTrackType(type: string): {
        tileLoaderClass: CustomTileLoader<TrackModel>;
        trackObjectClass: CustomTrackObject;
    };
    static getTrackTypes(): Array<string>;
    static setTheme(theme: 'dark' | 'light' | null): void;
    private static setBaseStyle;
    private static removeBaseStyle;
    private static trackTypes;
}
export default GenomeVisualizer;
