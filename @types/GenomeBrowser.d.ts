import * as React from "react";
import AppCanvas from "./ui/core/AppCanvas";
import TrackViewer, { Track } from "./ui/TrackViewer";
import TrackModel from "./track/TrackModel";
import IDataSource from "./data-source/IDataSource";
import GenomeBrowserConfiguration from "./GenomeBrowserConfiguration";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { TrackObject, TileCache } from "./track";
export interface GenomeBrowserRenderProps {
    width: number;
    height: number;
    pixelRatio?: number;
    style?: React.CSSProperties;
}
export declare class GenomeBrowser {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;
    constructor(dataSource: IDataSource | string, configuration?: GenomeBrowserConfiguration);
    setDataSource(dataSourceArg: IDataSource | string): void;
    setConfiguration(configuration: GenomeBrowserConfiguration): void;
    getConfiguration(): import("./ui/TrackViewerConfiguration").TrackViewerConfiguration;
    addTrack(model: TrackModel, heightPx?: number, animateIn?: boolean): Track;
    closeTrack(track: Track, animateOut: boolean, onComplete: () => void): void;
    getTracks(): Track[];
    getPanels(): Set<import("./ui/Panel").Panel>;
    render(props: GenomeBrowserRenderProps): JSX.Element;
    private _frameLoopHandle;
    protected startFrameLoop(): void;
    protected stopFrameLoop(): void;
    protected frameLoop: () => void;
    static registerTrackType<ModelType extends TrackModel>(type: ModelType['type'], tileCacheClass: {
        new (model: ModelType, contig: string, ...args: Array<any>): TileCache<any, any>;
    }, trackObjectClass: {
        new (model: TrackModel): TrackObject<TrackModel, any>;
    }): void;
    static getTrackType(type: string): {
        trackObjectClass: new (model: TrackModel) => TrackObject<TrackModel, TileCache<any, any>>;
        tileCacheClass: new (model: TrackModel, contig: string, ...args: any[]) => TileCache<any, any>;
    };
    private static trackTypes;
}
export default GenomeBrowser;
