import UsageCache from "engine/ds/UsageCache";
import Object2D from "engine/ui/Object2D";
import { Tile, TileCache } from "./TileCache";
import { TrackObject } from "./TrackObject";
import { TrackModel } from "./TrackModel";
/**
 * - to use, override constructTileNode()
 */
export declare class ShaderTrack<M extends TrackModel, P> extends TrackObject<M, TileCache<P, any>> {
    pixelRatio: number;
    protected densityMultiplier: number;
    protected _pixelRatio: number;
    constructor(model: M);
    protected constructTileNode(): TileNode<P>;
    protected _tileNodeCache: UsageCache<TileNode<P>>;
    protected updateDisplay(): void;
    protected createTileNode: () => TileNode<P>;
    protected deleteTileNode: (tileNode: TileNode<P>) => void;
    protected updateTileNode(tileNode: TileNode<P>, tile: Tile<any>, x0: number, span: number, displayLodLevel: number): void;
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
