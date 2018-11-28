import { SignalTileLoader, SignalTilePayload, Tile } from 'genome-visualizer';
import { DualSignalTrackModel } from './DualSignalTrackModel';

export class DualSignalTileLoader extends SignalTileLoader {

    protected readonly model: DualSignalTrackModel;

    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload> {
        return null;
    }

}