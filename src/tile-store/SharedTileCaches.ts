import { TileCache } from "../track/TileCache";

export class SharedTileCache {

    private static tileCaches: {
        [type: string]: {
            [sourceId: string]: TileCache<any, any>
        }
    } = {};

    static getTileCache<T extends TileCache<any, any>>(type: string, sourceKey: string, constructor: (sourceId: string) => T): T {
        let typeTileCaches = this.tileCaches[type] = this.tileCaches[type] || {};
        let tileCache: T = typeTileCaches[sourceKey] = (typeTileCaches[sourceKey] as T) || constructor(sourceKey);
        return tileCache;
    }

    static clear(type: string) {
        let typeTileCaches = this.tileCaches[type];
        if (typeTileCaches === undefined) return;

        for (let sourceId in typeTileCaches) {
            let tileCache = typeTileCaches[sourceId];
            tileCache.clear();
        }

        delete this.tileCaches[type];
    }

    static clearAll() {
        for (let type in this.tileCaches) {
            this.clear(type);
        }
    }

}

export default SharedTileCache;