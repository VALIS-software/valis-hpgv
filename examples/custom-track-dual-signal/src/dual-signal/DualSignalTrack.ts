import { TrackObject, SignalTrack, InternalDataSource, AxisPointerStyle, TrackModel, SignalTrackModel } from "genome-visualizer";
import { DualSignalTrackModel } from "./DualSignalTrackModel";
import { DualSignalTileLoader } from "./DualSignalTileLoader";

export class DualSignalTrack extends TrackObject<DualSignalTrackModel, DualSignalTileLoader> {

    protected signalTrack1: SignalTrack<SignalTrackModel>;
    protected signalTrack2: SignalTrack<SignalTrackModel>;
    protected initialized = false;

    constructor(model: DualSignalTrackModel) {
        super(model);
        this.render = false;

        let trackModel: TrackModel = model;

        this.signalTrack1 = new SignalTrack({
            ...trackModel,
            type: 'signal',
            path: model.path1,
        });

        this.signalTrack2 = new SignalTrack({
            ...trackModel,
            type: 'signal',
            path: model.path2,
        });

        // fill space of this track
        this.signalTrack1.relativeW = 1;
        this.signalTrack1.relativeH = 0.5;
        this.signalTrack2.relativeW = 1;
        this.signalTrack2.relativeH = 0.5;
        this.signalTrack2.relativeY = 0.5;

        this.signalTrack1.color.set([0.2, 0, 0, 1]);
        this.signalTrack2.color.set([0, 0.2, 0, 1]);

        this.add(this.signalTrack1); 
        this.add(this.signalTrack2);

        this.initialized = true;
    }

    setDataSource(dataSource: InternalDataSource) {
        super.setDataSource(dataSource);
        if (this.initialized) {
            this.signalTrack1.setDataSource(dataSource);
            this.signalTrack2.setDataSource(dataSource);
        }
    }

    setContig(contig: string) {
        super.setContig(contig);
        if (this.initialized) {
            this.signalTrack1.setContig(contig);
            this.signalTrack2.setContig(contig);
        }
    }

    setRange(x0: number, x1: number) {
        super.setRange(x0, x1);
        if (this.initialized) {
            this.signalTrack1.setRange(x0, x1);
            this.signalTrack2.setRange(x0, x1);
        }
    }

    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle) {
        super.setAxisPointer(id, fractionX, style);
        if (this.initialized) {
            this.signalTrack1.setAxisPointer(id, fractionX, style);
            this.signalTrack2.setAxisPointer(id, fractionX, style);
        }
    }

    removeAxisPointer(id: string) {
        super.removeAxisPointer(id);
        if (this.initialized) {
            this.signalTrack1.removeAxisPointer(id);
            this.signalTrack2.removeAxisPointer(id);
        }
    }

    setFocusRegion(x0_fractional: number, x1_fractional: number) {
        super.setFocusRegion(x0_fractional, x1_fractional);
        if (this.initialized) {
            this.signalTrack1.setFocusRegion(x0_fractional, x1_fractional);
            this.signalTrack2.setFocusRegion(x0_fractional, x1_fractional);
        }
    }

    clearFocusRegion() {
        super.clearFocusRegion();
        if (this.initialized) {
            this.signalTrack1.clearFocusRegion();
            this.signalTrack2.clearFocusRegion();
        }
    }

    applyTransformToSubNodes(root?: boolean) {
        super.applyTransformToSubNodes(root);
        if (this.initialized) {
            this.signalTrack1.applyTransformToSubNodes(root);
            this.signalTrack2.applyTransformToSubNodes(root);
        }
    }

    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number) {
        this.signalTrack1.updateDisplay(samplingDensity, continuousLodLevel, span, widthPx);
        this.signalTrack2.updateDisplay(samplingDensity, continuousLodLevel, span, widthPx);
    }

}