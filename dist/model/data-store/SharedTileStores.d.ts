import { TileStore } from "./TileStore";
export declare class SharedTileStore {
    private static tileStores;
    static getTileStore<T extends TileStore<any, any>>(type: string, sourceKey: string, constructor: (sourceId: string) => T): T;
    static clear(type: string): void;
    static clearAll(): void;
}
export default SharedTileStore;
