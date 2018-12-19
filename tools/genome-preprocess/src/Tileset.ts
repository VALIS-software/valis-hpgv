export type TilesetTile = {
    startIndex: number,
    span: number,
    content: Array<any>
};

type Feature = {
    [key: string]: any
}

export class Tileset {

    readonly sequences: { [sequenceId: string]: Array<TilesetTile> } = {};

    constructor(
        protected tileSize: number,
    ) { }

    addFeature = (sequenceId: string, startIndex: number, length: number, feature: Feature) => {
        // tiles are determined at the top level
        let endIndex = startIndex + length;
        let i0 = Math.floor(startIndex / this.tileSize);
        let i1 = Math.floor(endIndex / this.tileSize);
        for (let i = i0; i <= i1; i++) {
            let tile = this.getTile(sequenceId, i);
            this.pushFeature(tile, feature);
        }
    }

    protected pushFeature(tile: TilesetTile, feature: Feature) {
        tile.content.push(feature);
    }

    protected getTile(sequenceId: string, index: number) {
        let tiles = this.sequences[sequenceId];
        if (tiles === undefined) {
            // create tile array for sequence	
            tiles = this.sequences[sequenceId] = [];
        }
        if (tiles[index] === undefined) {
            // create intervening tiles	
            for (let i = 0; i <= index; i++) {
                if (tiles[i] === undefined) {
                    tiles[i] = {
                        startIndex: i * this.tileSize,
                        span: this.tileSize,
                        content: []
                    }
                }
            }
        }
        return tiles[index];
    }
}

export default Tileset; 