import { TileLoader, IDataSource, SignalTileLoader, TrackModel, TextureFormat, SignalTilePayload, GPUTexture, GPUDevice, Tile } from 'genome-visualizer';
import { DualSignalTrackModel } from './DualSignalTrackModel';

export class DualSignalTileLoader extends SignalTileLoader {

    protected bigWigLoader2: any;

    static cacheKey(model: any) {
        return model.path + '\x1f' + model.path2;
    }

    constructor(dataSource: IDataSource, model: DualSignalTrackModel, contig: string, ...args: Array<any>) {
        super(dataSource, { ...model, type: 'signal' }, contig);
    }

    protected initializationPromise() {
        return Promise.all([
            super.initializationPromise(),
            this.getBigWigLoader((this.model as any as DualSignalTrackModel).path2).then((loader) => {
                this.bigWigLoader2 = loader;
            })
        ]).then(() => {});
    }

    protected loadPayloadBuffer(tile: Tile<SignalTilePayload>): Promise<Float32Array> {
        return super.loadPayloadBuffer(tile) // load the first bigwig tile
            .then(
                (buffer) => this.getBigWigData(
                    this.bigWigLoader2,
                    tile,
                    buffer,
                    this.nChannels,
                    1
                )
            );
    }
    
}