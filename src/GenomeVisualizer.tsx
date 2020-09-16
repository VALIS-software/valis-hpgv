import * as React from "react";
import * as ReactDOM from "react-dom";

import { Animator } from "./Animator";
import { IDataSource } from "./data-source/IDataSource";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { ManifestDataSource, Manifest } from "./data-source/ManifestDataSource";
import { GenomeVisualizerConfiguration } from "./GenomeVisualizerConfiguration";
import { TrackModel } from "./track/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import { TrackViewer, Track } from "./ui/TrackViewer";
import { IntervalTileLoader, IntervalTrack } from "./track/interval";
import { TileLoader } from "./track/TileLoader";
import { AnnotationTileLoader } from "./track/annotation/AnnotationTileLoader";
import { AnnotationTrack } from "./track/annotation/AnnotationTrack";
import { SequenceTileLoader } from "./track/sequence/SequenceTileLoader";
import { SequenceTrack } from "./track/sequence/SequenceTrack";
import { VariantTileLoader } from "./track/variant/VariantTileLoader";
import { VariantTrack } from "./track/variant/VariantTrack";
import { TrackObject } from "./track/TrackObject";
import { SignalTileLoader } from "./track/signal/SignalTileLoader";
import { SignalTrack } from "./track/signal/SignalTrack";
import { BigWigReader, AxiosDataLoader } from "bigwig-reader";
import { SignalTrackModel, AnnotationTrackModel, SequenceTrackModel, VariantTrackModel } from "./track";
import { GenomicLocation, Contig } from "./model";
import { Panel } from "./ui";
import Axios from "axios";
import { Formats, GenomicFileFormat } from "./formats/Formats";

export interface GenomeVisualizerRenderProps {
    width: number,
    height: number,

    pixelRatio?: number,
    style?: React.CSSProperties,
    highlightLocation?: string,
}

interface CustomTileLoader<ModelType> {
    new(dataSource: IDataSource, model: ModelType, contig: string, ...args: Array<any>): TileLoader<any, any>;

    // produce a key differentiates models that require a separate tile loader / data cache instance
    cacheKey (model: ModelType): string | null;
    getAvailableContigs(model: ModelType): Promise<Array<Contig>>;
}

interface CustomTrackObject {
    new(model: TrackModel): TrackObject<TrackModel, any>;

    getDefaultHeightPx?: (model: TrackModel) => number; // optionally override the default track height
    getExpandable?: (model: TrackModel) => boolean; // disable expandability by setting this to false

    styleNodes?: React.ReactNode; // occasionally it might be useful to have sub nodes within a track's style proxy node
}
export class GenomeVisualizer {

    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;

    constructor(configuration?: GenomeVisualizerConfiguration, dataSource?: IDataSource | string){
        this.trackViewer = new TrackViewer();

        this.setDataSource(dataSource);

        if (Array.isArray(configuration)) {
            if (configuration.length > 0) {
                // add tracks from path list
                for (let path of configuration) {
                    this.addTrackFromFilePath(path, undefined, false);
                }
            }
        } else {
            if (configuration != null) {
                this.setConfiguration(configuration);
            }
        }
    }

    setDataSource(dataSourceArg: IDataSource | string | undefined) {
        let dataSource: IDataSource;
        if ((typeof dataSourceArg === 'string') || (dataSourceArg == null)) {
            // if first argument is string, use a manifest data source
            // if a manifest data source is created with a null path then it acts as an empty manifest
            dataSource = new ManifestDataSource(dataSourceArg as any);
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

    setConfiguration(configuration: GenomeVisualizerConfiguration) {
        this.trackViewer.setConfiguration(configuration);
    }

    getConfiguration() {
        return this.trackViewer.getConfiguration();
    }

    /**
     * Sets the current displayed genomic location (contig, region) of the first open panel
     * @param genomicLocation `{contig: string, x0: number, x1: number}`
     */
    setLocation(genomicLocation: GenomicLocation) {
        this.setContig(genomicLocation.contig);
        this.setRange(genomicLocation.x0, genomicLocation.x1);
    }

    /**
     * Sets the current displayed contig of the first open panel
     * Use with `setRange()` to specify a complete location
     * @param contig id of contig within available data
     */
    setContig(contig: string) {
        if (this.getPanels().length > 0) {
            this.getPanels()[0].setContig(contig);
        }
    }

    /**
     * Sets the current displayed region of the first open panel
     * Spanned length = x1 - x0
     * @param x0 left base index (starting at 0)
     * @param x1 right base index
     */
    setRange(x0: number, x1: number) {
        if (this.getPanels().length > 0) {
            this.getPanels()[0].setRange(x0, x1);
        }
    }

    addTrack(model: TrackModel, animateIn: boolean = true, highlightLocation: string) {
        return this.trackViewer.addTrack(model, animateIn, highlightLocation);
    }

    addTrackFromFilePath(path: string, name?: string, animateIn?: boolean, highlightLocation?: string) {
        // we don't know what contigs are available so we must read the first file for this
        let basename = path.split('/').pop().split('\\').pop();
        let parts = basename.split('.');
        parts.pop();
        let filename = parts.join('.');

        let trackName = (name != null ? name : filename);

        let format = Formats.determineFormat(path);

        switch (format) {
            case GenomicFileFormat.BigWig: {
                let model: SignalTrackModel = {
                    type: 'signal',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            case GenomicFileFormat.ValisGenes:
            case GenomicFileFormat.BigBed:
            {
                let model: AnnotationTrackModel = {
                    type: 'annotation',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            case GenomicFileFormat.ValisDna: {
                let model: SequenceTrackModel = {
                    type: 'sequence',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            case GenomicFileFormat.ValisVariants: {
                let model: VariantTrackModel = {
                    type: 'variant',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            /*
            case 'bam': { break; }
            case 'vcf': { break; }
            case 'fasta': { break; }
            case 'gff3': { break; }
            */
            default: {
                console.error(`Error adding track: Unsupported file "${path}"`);
                break;
            }
        }

        return null;
    }

    addPanel(location: GenomicLocation, animateIn: boolean) {
        return this.trackViewer.addPanel(location, animateIn);
        // Previously had --> but I think it's not necessary
        // return this.trackViewer.addPanel(location, animateIn, 'chr1:12345');
    }

    closeTrack(track: Track, animateOut: boolean = true, onComplete?: () => void) {
        return this.trackViewer.closeTrack(track, animateOut, onComplete);
    }

    closePanel(panel: Panel, animateOut: boolean, onComplete?: () => void) {
        return this.trackViewer.closePanel(panel, animateOut, onComplete);
    }

    setTrackIndex(track: Track, index: number, animate = true) {
        return this.trackViewer.setTrackIndex(track, index, animate);
    }

    moveTrackUp(track: Track, animate = true) {
        return this.trackViewer.moveTrackUp(track, animate);
    }

    moveTrackDown(track: Track, animate = true) {
        return this.trackViewer.moveTrackDown(track, animate);
    }

    getTracks() {
        return this.trackViewer.getTracks();
    }

    getPanels() {
        return Array.from(this.trackViewer.getPanels());
    }

    clearCaches() {
        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
        }
    }

    addEventListener(event: string, listener: (...args: any[]) => void) {
        this.trackViewer.addEventListener(event, listener);
    }

    removeEventListener(event: string, listener: (...args: any[]) => void) {
        this.trackViewer.removeEventListener(event, listener);
    }

    getContentHeight() {
        return this.trackViewer.getContentHeight();
    }

    render(props: GenomeVisualizerRenderProps, container: HTMLElement) {
        ReactDOM.render(this.reactRender(props), container);
    }

    reactRender(props: GenomeVisualizerRenderProps = {
        width: null,
        height: null,
    }) {
        let width = props.width == null ? 800 : props.width;
        let height = props.height == null ? 600 : props.height;

        return (<>
            <AppCanvas
                ref={(v) => {
                    this.appCanvasRef = v;
                    this.startFrameLoop();
                }}
                width={width}
                height={height}
                className={'hpgv'}
                content={this.trackViewer}
                pixelRatio={props.pixelRatio || window.devicePixelRatio || 1}
                style={{
                    // default style
                    fontFamily: 'sans-serif',
                    ...props.style
                }}
                onWillUnmount={() => {
                    this.stopFrameLoop();
                    this.clearCaches();
                }}
            >
                <div className="hpgv_style-proxies" style={{ display: 'none' }}>
                    {this.trackViewer.getStyleNodes()}
                </div>
            </AppCanvas>
        </>);
    }

    /**
     * This method will update non-dom elements relying on CSS.
     * Useful to call after the CSS changes, however, if the inline style on style proxy node changes then the update will happen automatically.
     */
    refreshStyle() {
        this.trackViewer.refreshStyle();
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
        if (this.appCanvasRef == null) return;

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
        let trackClass = this.trackTypes[type];
        if (trackClass == null) {
            console.warn(`No track type "${type}", available types are: ${Object.keys(this.trackTypes).join(', ')}`);
        }
        return trackClass;
    }

    static getTrackTypes(): Array<string> {
        return Object.keys(this.trackTypes);
    }

    static setTheme(theme: 'dark' | 'light' | null) {
        let defaultTheme = 'light';
        this.setBaseStyle(require('./styles/' + (theme || defaultTheme) + '.css'));
    }

    private static setBaseStyle(cssString: string) {
        let hpgvStyleEl = document.head.querySelector('style#hpgv-base');

        // if null, remove any existing base css
        if (cssString == null) {
            if (hpgvStyleEl != null) {
                hpgvStyleEl.remove();
            }
            return;
        }

        if (hpgvStyleEl == null) {
            // add hpgv style
            hpgvStyleEl = document.createElement('style');
            hpgvStyleEl.id = 'hpgv-base';
            (document.head as any).prepend(hpgvStyleEl);
        }
        hpgvStyleEl.innerHTML = cssString;
    }

    private static removeBaseStyle() {
        let hpgvStyleEl = document.head.querySelector('style#hpgv-base');
        if (hpgvStyleEl != null) {
            hpgvStyleEl.remove();
        }
    }

    private static trackTypes: {
        [ type: string ]: {
            tileLoaderClass: CustomTileLoader<TrackModel>
            trackObjectClass: CustomTrackObject
        }
    } = {};

}

// register track types
GenomeVisualizer.registerTrackType('annotation', AnnotationTileLoader, AnnotationTrack);
GenomeVisualizer.registerTrackType('interval', IntervalTileLoader, IntervalTrack);
GenomeVisualizer.registerTrackType('sequence', SequenceTileLoader, SequenceTrack);
GenomeVisualizer.registerTrackType('variant', VariantTileLoader, VariantTrack);
GenomeVisualizer.registerTrackType('signal', SignalTileLoader, SignalTrack);

GenomeVisualizer.setTheme('light');

export default GenomeVisualizer;
