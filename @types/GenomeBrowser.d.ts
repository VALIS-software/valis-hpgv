import * as React from "react";
import { IDataSource } from "./data-source/IDataSource";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { GenomeBrowserConfiguration } from "./GenomeBrowserConfiguration";
import { TrackModel } from "./track/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import { TrackViewer, Track } from "./ui/TrackViewer";
import { TileLoader } from "./track/TileLoader";
import { TrackObject } from "./track/TrackObject";
export interface GenomeBrowserRenderProps {
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
export declare class GenomeBrowser {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;
    constructor(configuration?: GenomeBrowserConfiguration, dataSource?: IDataSource | string);
    setDataSource(dataSourceArg: IDataSource | string | undefined): void;
    setConfiguration(configuration: GenomeBrowserConfiguration): void;
    getConfiguration(): import("./ui/TrackViewerConfiguration").TrackViewerConfiguration;
    addTrack(model: TrackModel, animateIn?: boolean): Track;
    closeTrack(track: Track, animateOut: boolean, onComplete: () => void): void;
    getTracks(): Track[];
    getPanels(): Set<import("./ui/Panel").Panel>;
    clearCaches(): void;
    render(props: GenomeBrowserRenderProps, container: HTMLElement): void;
    reactRender(props: GenomeBrowserRenderProps): JSX.Element;
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
export default GenomeBrowser;
