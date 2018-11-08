import * as React from "react";
import { IDataSource } from "./data-source/IDataSource";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { GenomeVisualizerConfiguration } from "./GenomeVisualizerConfiguration";
import { TrackModel } from "./track/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import { TrackViewer, Track } from "./ui/TrackViewer";
import { TileLoader } from "./track/TileLoader";
import { TrackObject } from "./track/TrackObject";
import { GenomicLocation } from "./model";
import { Panel } from "./ui";
export interface GenomeVisualizerRenderProps {
    width: number;
    height: number;
    pixelRatio?: number;
    style?: React.CSSProperties;
}
interface CustomTileLoader<ModelType> {
    new (dataSource: IDataSource, model: ModelType, contig: string, ...args: Array<any>): TileLoader<any, any>;
    cacheKey(model: ModelType): string | null;
}
interface CustomTrackObject {
    new (model: TrackModel): TrackObject<TrackModel, any>;
}
export declare class GenomeVisualizer {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;
    constructor(configuration?: GenomeVisualizerConfiguration | Array<string>, dataSource?: IDataSource | string);
    setDataSource(dataSourceArg: IDataSource | string | undefined): void;
    setConfiguration(configuration: GenomeVisualizerConfiguration): void;
    getConfiguration(): import("./ui/TrackViewerConfiguration").TrackViewerConfiguration;
    addTrack(model: TrackModel, animateIn?: boolean): Track;
    addTrackFromFilePath(path: string, animateIn: boolean): Track;
    addPanel(location: GenomicLocation, animateIn: boolean): void;
    closeTrack(track: Track, animateOut?: boolean, onComplete?: () => void): void;
    closePanel(panel: Panel, animateOut: boolean, onComplete?: () => void): void;
    getTracks(): Track[];
    getPanels(): Set<Panel>;
    clearCaches(): void;
    render(props: GenomeVisualizerRenderProps, container: HTMLElement): void;
    reactRender(props?: GenomeVisualizerRenderProps): JSX.Element;
    private _frameLoopHandle;
    protected startFrameLoop(): void;
    protected stopFrameLoop(): void;
    protected frameLoop: () => void;
    static registerTrackType<ModelType extends TrackModel>(type: ModelType['type'], tileLoaderClass: CustomTileLoader<ModelType>, trackObjectClass: CustomTrackObject): void;
    static getTrackType(type: string): {
        tileLoaderClass: CustomTileLoader<TrackModel>;
        trackObjectClass: CustomTrackObject;
    };
    private static trackTypes;
}
export default GenomeVisualizer;
