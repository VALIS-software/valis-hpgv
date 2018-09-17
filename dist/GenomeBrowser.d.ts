import * as React from "react";
import AppCanvas from "./ui/core/AppCanvas";
import TrackViewer, { TrackViewerConfiguration, Track } from "./ui/TrackViewer";
import { TrackModel } from "./model/TrackModel";
export interface GenomeBrowserConfiguration extends TrackViewerConfiguration {
}
export interface GenomeBrowserRenderProps {
    width: number;
    height: number;
    pixelRatio?: number;
    style?: React.CSSProperties;
}
export default class GenomeBrowser {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    constructor(configuration?: GenomeBrowserConfiguration);
    setConfiguration(configuration: GenomeBrowserConfiguration): void;
    getConfiguration(): TrackViewerConfiguration;
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
