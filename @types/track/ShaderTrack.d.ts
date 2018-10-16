import UsageCache from "engine/ds/UsageCache";
import Object2D from "engine/ui/Object2D";
import { Tile, TileLoader } from "./TileLoader";
import { TrackModel } from "./TrackModel";
import { TrackObject } from "./TrackObject";
/**
 * - to use, override constructTileNode()
 */
export declare class ShaderTrack<Model extends TrackModel, Loader extends TileLoader<TilePayload, any>, TilePayload = any> extends TrackObject<Model, Loader> {
    pixelRatio: number;
    protected densityMultiplier: number;
    protected _pixelRatio: number;
    constructor(model: Model);
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
