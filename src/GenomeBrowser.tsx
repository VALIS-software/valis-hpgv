import * as React from "react";

import { Animator } from "engine/animation/Animator";
import { IDataSource } from "./data-source/IDataSource";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { ManifestDataSource } from "./data-source/ManifestDataSource";
import { GenomeBrowserConfiguration } from "./GenomeBrowserConfiguration";
import { TrackModel } from "./track/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import { TrackViewer, Track } from "./ui/TrackViewer";
import { IntervalTileLoader, IntervalTrack } from "./track/interval";
import { TileLoader } from "./track/TileLoader";
import { AnnotationTileLoader, MacroAnnotationTileLoader } from "./track/annotation/AnnotationTileLoader";
import { AnnotationTrack } from "./track/annotation/AnnotationTrack";
import { SequenceTileLoader } from "./track/sequence/SequenceTileLoader";
import { SequenceTrack } from "./track/sequence/SequenceTrack";
import { VariantTileLoader } from "./track/variant/VariantTileLoader";
import { VariantTrack } from "./track/variant/VariantTrack";
import { TrackObject } from "./track/TrackObject";

export interface GenomeBrowserRenderProps {
    width: number,
    height: number,

    pixelRatio?: number,
    style?: React.CSSProperties,
}

interface CustomTileLoader<ModelType> {
    new(dataSource: IDataSource, model: ModelType, contig: string, ...args: Array<any>): TileLoader<any, any>;
}

interface CustomTrackObject {
    new(model: TrackModel): TrackObject<TrackModel, any>;
}
export class GenomeBrowser {

    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;

    constructor(dataSource: IDataSource | string, configuration?: GenomeBrowserConfiguration){
        this.trackViewer = new TrackViewer();

        if (dataSource != null) {
            this.setDataSource(dataSource);
        }

        if (configuration != null) {
            this.setConfiguration(configuration);
        }
    }

    setDataSource(dataSourceArg: IDataSource | string) {
        let dataSource: IDataSource;
        if (typeof dataSourceArg === 'string') {
            // if first argument is string, use a manifest data source
            dataSource = new ManifestDataSource(dataSourceArg);
        } else {
            dataSource = dataSourceArg;
        }

        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
            this.internalDataSource = null;
        }

        this.internalDataSource = new InternalDataSource(dataSource);

        this.trackViewer.setDataSource(this.internalDataSource);
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

    clearCaches() {
        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
        }
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

    static registerTrackType<ModelType extends TrackModel>(
        type: ModelType['type'],
        tileLoaderClass: CustomTileLoader<ModelType>,
        trackObjectClass: CustomTrackObject,
    ) {
        this.trackTypes[type] = {
            tileLoaderClass: tileLoaderClass,
            trackObjectClass: trackObjectClass,
        }
    }

    static getTrackType(type: string) {
        return this.trackTypes[type];
    }

    private static trackTypes: {
        [ type: string ]: {
            tileLoaderClass: CustomTileLoader<TrackModel>
            trackObjectClass: CustomTrackObject
        }
    } = {};

}

// register track types
GenomeBrowser.registerTrackType('annotation', AnnotationTileLoader, AnnotationTrack);
GenomeBrowser.registerTrackType('macro-annotation', MacroAnnotationTileLoader, AnnotationTrack);
GenomeBrowser.registerTrackType('interval', IntervalTileLoader, IntervalTrack);
GenomeBrowser.registerTrackType('sequence', SequenceTileLoader, SequenceTrack);
GenomeBrowser.registerTrackType('variant', VariantTileLoader, VariantTrack);

export default GenomeBrowser;