import * as React from "react";
import Animator from "engine/animation/Animator";
import AppCanvas from "./ui/core/AppCanvas";
import TrackViewer, { TrackViewerConfiguration, Track } from "./ui/TrackViewer";
import { TrackModel } from "genome-browser/model/TrackModel";

export interface GenomeBrowserConfiguration extends TrackViewerConfiguration {

}

export interface GenomeBrowserRenderProps {
    width: number,
    height: number,

    pixelRatio?: number,
    style?: React.CSSProperties,
}

export default class GenomeBrowser {

    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;

    constructor(configuration?: GenomeBrowserConfiguration){
        this.trackViewer = new TrackViewer();

        if (configuration != null) {
            this.setConfiguration(configuration);
        }
    }

    setConfiguration(configuration: GenomeBrowserConfiguration) {
        this.trackViewer.setConfiguration(configuration);
    }

    getConfiguration() {
        return this.trackViewer.getConfiguration();
    }

    addTrack(model: TrackModel, heightPx: number = 50, animateIn: boolean = true) {
        return this.trackViewer.addTrack(model, heightPx, animateIn);
    }

    closeTrack(track: Track, animateOut: boolean = true, onComplete: () => void) {
        return this.trackViewer.closeTrack(track, animateOut, onComplete);
    }

    getTracks() {
        return this.trackViewer.getTracks();
    }

    getPanels() {
        return this.trackViewer.getPanels();
    }

    render(props: GenomeBrowserRenderProps) {
        return (
            <AppCanvas
                ref={(v) => {
                    this.appCanvasRef = v;
                    this.startFrameLoop();
                }}
                width={props.width}
                height={props.height}
                content={this.trackViewer}
                pixelRatio={props.pixelRatio || window.devicePixelRatio || 1}
                style={props.style}
                onWillUnmount={() => {
                    this.stopFrameLoop();
                }}
            />
        );
    }

    private _frameLoopHandle: number = 0;
    protected startFrameLoop() {
        if (this._frameLoopHandle === 0) {
            this.frameLoop();
        }
    }

    protected stopFrameLoop() {
        if (this._frameLoopHandle !== 0) {
            window.cancelAnimationFrame(this._frameLoopHandle);
            this._frameLoopHandle = 0;
        }
    }

    protected frameLoop = () => {
        this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);

        // appCanvas should react to user input before animation are stepped
        // this enables any animations spawned by the interaction events to be progressed before rendering
        this.appCanvasRef.handleUserInteraction();

        Animator.frame();

        this.appCanvasRef.renderCanvas();
    }

}