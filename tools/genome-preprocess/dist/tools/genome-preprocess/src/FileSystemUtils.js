"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDirectory = void 0;
const Terminal_1 = require("./Terminal");
const fs = require("fs");
function deleteDirectory(directory) {
    // catch possible catastrophe
    let lc = directory.trim().toLowerCase();
    if (lc[0] === '/' || lc === '' || lc === '.') {
        Terminal_1.default.error(`Illegal directory <b>${directory}</b>`);
        throw 'Error deleting directory';
    }
    // delete output directory
    if (fs.existsSync(directory)) {
        // Terminal.log(`Deleting directory <b>${directory}</b>`);
        for (let filename of fs.readdirSync(directory)) {
            let p = directory + '/' + filename;
            if (fs.lstatSync(p).isDirectory()) {
                deleteDirectory(p);
            }
            else {
                fs.unlinkSync(p);
            }
        }
        fs.rmdirSync(directory);
    }
}
exports.deleteDirectory = deleteDirectory;
