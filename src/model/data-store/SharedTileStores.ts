import { TileStore } from "./TileStore";

export class SharedTileStore {

    private static tileStores: {
        [type: string]: {
            [sourceId: string]: TileStore<any, any>
        }
    } = {};

    static getTileStore<T extends TileStore<any, any>>(type: string, sourceKey: string, constructor: (sourceId: string) => T): T {
        let typeTileStores = this.tileStores[type] = this.tileStores[type] || {};
        let tileStore: T = typeTileStores[sourceKey] = (typeTileStores[sourceKey] as T) || constructor(sourceKey);
        return tileStore;
    }

    static clear(type: string) {
        let typeTileStores = this.tileStores[type];
        if (typeTileStores === undefined) return;

        for (let sourceId in typeTileStores) {
            let tileStore = typeTileStores[sourceId];
            tileStore.clear();
        }

        delete this.tileStores[type];
    }

    static clearAll() {
        for (let type in this.tileStores) {
            this.clear(type);
        }
    }

}

export default SharedTileStore;