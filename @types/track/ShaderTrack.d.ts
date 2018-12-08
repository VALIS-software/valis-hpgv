import UsageCache from "engine/ds/UsageCache";
import Object2D from "engine/ui/Object2D";
import { Tile, TileLoader } from "./TileLoader";
import { TrackModel } from "./TrackModel";
import { TrackObject } from "./TrackObject";
interface CustomTileNode<Payload> {
    new (...args: Array<any>): ShaderTile<Payload>;
}
export declare class ShaderTrack<Model extends TrackModel, Loader extends TileLoader<TilePayload, any>, TilePayload = any> extends TrackObject<Model, Loader> {
    protected customTileNodeClass: CustomTileNode<TilePayload>;
    protected densityMultiplier: number;
    constructor(model: Model, customTileNodeClass: CustomTileNode<TilePayload>);
    protected _tileNodeCache: UsageCache<ShaderTile<TilePayload>>;
    updateDisplay(samplingDensity: number, continuousLodLevel: number, span: number, widthPx: number): void;
    protected createTileNode(...args: Array<any>): ShaderTile<TilePayload>;
    protected deleteTileNode(tileNode: ShaderTile<TilePayload>): void;
    protected updateTileNode(tileNode: ShaderTile<TilePayload>, tile: Tile<any>, x0: number, span: number, displayLodLevel: number): void;
    protected tileNodeIsOpaque(tileNode: ShaderTile<any>): boolean;
}
export declare class ShaderTile<TilePayload> extends Object2D {
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
