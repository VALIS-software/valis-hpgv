import { TileLoader, IDataSource, SignalTileLoader, TrackModel, TextureFormat, SignalTilePayload, GPUTexture, GPUDevice, Tile } from 'genome-visualizer';
import { DualSignalTrackModel } from './DualSignalTrackModel';

export class DualSignalTileLoader extends SignalTileLoader {

    protected bigWigLoader2: any;

    static cacheKey(model: any) {
        // for correct model-tile caching, we must define a cache key that's unique to a given model's tile data
        return model.path + '\x1f' + model.path2;
    }

    // when initializationPromise() completes, the tile loader is considered 'ready' to load tiles
    // we should delay completing initialization until the second bigwig header has loaded
    protected initializationPromise() {
        return Promise.all([
            super.initializationPromise(),
            this.getBigWigLoader((this.model as any as DualSignalTrackModel).path2).then((loader) => {
                this.bigWigLoader2 = loader;
            })
        ]).then(() => { });
    }

    // loadPayloadBuffer(tile) returns an array buffer containing signal data corresponding to a given tile
    // we override this method to also load and add our second signal's data
    protected loadPayloadBuffer(tile: Tile<SignalTilePayload>): Promise<Float32Array> {
        // load the first bigwig tile
        return super.loadPayloadBuffer(tile)
            // then load the second bigwig tile into the same buffer as the first (which is returned from the first's promise)
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