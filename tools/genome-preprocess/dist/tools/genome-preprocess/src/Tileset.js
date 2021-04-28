"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tileset = void 0;
class Tileset {
    constructor(tileSize) {
        this.tileSize = tileSize;
        this.sequences = {};
        this.addFeature = (sequenceId, startIndex, length, feature) => {
            // tiles are determined at the top level
            let endIndex = startIndex + length;
            let i0 = Math.floor(startIndex / this.tileSize);
            let i1 = Math.floor(endIndex / this.tileSize);
            for (let i = i0; i <= i1; i++) {
                let tile = this.getTile(sequenceId, i);
                this.pushFeature(tile, feature);
            }
        };
    }
    pushFeature(tile, feature) {
        tile.content.push(feature);
    }
    getTile(sequenceId, index) {
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
                    };
                }
            }
        }
        return tiles[index];
    }
}
exports.Tileset = Tileset;
exports.default = Tileset;
