import * as React from "react";
import AppCanvas from "./ui/core/AppCanvas";
import TrackViewer, { Track } from "./ui/TrackViewer";
import TrackModel from "./model/TrackModel";
import DataSource from "./model/DataSource";
import GenomeBrowserConfiguration from "./GenomeBrowserConfiguration";
export interface GenomeBrowserRenderProps {
    width: number;
    height: number;
    pixelRatio?: number;
    style?: React.CSSProperties;
}
export declare class GenomeBrowser {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected dataSource: DataSource;
    constructor(dataSource: DataSource, configuration?: GenomeBrowserConfiguration);
    setConfiguration(configuration: GenomeBrowserConfiguration): void;
    getConfiguration(): import("./ui/TrackViewer").TrackViewerConfiguration;
    addTrack(model: TrackModel, heightPx?: number, animateIn?: boolean): Track;
    closeTrack(track: Track, animateOut: boolean, onComplete: () => void): void;
    getTracks(): Track[];
    getPanels(): Set<import("./ui/Panel").Panel>;
    render(props: GenomeBrowserRenderProps): JSX.Element;
    private _frameLoopHandle;
    protected startFrameLoop(): void;
    protected stopFrameLoop(): void;
    protected frameLoop: () => void;
}
export default GenomeBrowser;
