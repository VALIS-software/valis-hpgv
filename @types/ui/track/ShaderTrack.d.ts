import UsageCache from "engine/ds/UsageCache";
import TrackModel from "../../model/TrackModel";
import Object2D from "engine/ui/Object2D";
import TileStore, { Tile } from "../../tile-store/TileStore";
import { TrackObject } from "./BaseTrack";
/**
 * TileTrack provides a base class for Tracks that use TileStore
 */
export declare class ShaderTrack<TilePayload, BlockPayload> extends TrackObject {
    protected tileStoreType: string;
    protected tileStoreConstructor: (contig: string) => TileStore<TilePayload, BlockPayload>;
    pixelRatio: number;
    protected densityMultiplier: number;
    protected tileStore: TileStore<TilePayload, BlockPayload>;
    protected _pixelRatio: number;
    constructor(model: TrackModel, tileStoreType: string, tileStoreConstructor: (contig: string) => TileStore<TilePayload, BlockPayload>);
    setContig(contig: string): void;
    protected constructTileNode(): TileNode<TilePayload>;
    protected _tileNodeCache: UsageCache<TileNode<TilePayload>>;
    protected updateDisplay(): void;
    protected createTileNode: () => TileNode<TilePayload>;
    protected deleteTileNode: (tileNode: TileNode<TilePayload>) => void;
    protected updateTileNode(tileNode: TileNode<TilePayload>, tile: Tile<any>, x0: number, span: number, displayLodLevel: number): void;
    protected tileNodeIsOpaque(tileNode: TileNode<any>): boolean;
}
export declare class TileNode<TilePayload> extends Object2D {
    opacity: number;
    displayLodLevel: number;
    protected _opacity: number;
    protected tile: Tile<TilePayload>;
    constructor();
    setTile(tile: Tile<TilePayload>): void;
    getTile(): Tile<TilePayload>;
    protected tileCompleteListener: () => void;
    protected onTileComplete(): void;
}
export default ShaderTrack;
