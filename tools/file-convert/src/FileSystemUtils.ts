import Terminal from "./Terminal";
import * as fs from 'fs';

export function deleteDirectory(directory: string) {
    // catch possible catastrophe
    let lc = directory.trim().toLowerCase();
    if (lc[0] === '/' || lc === '' || lc === '.') {
        Terminal.error(`Illegal directory <b>${directory}</b>`);
        throw 'Error deleting directory';
    }

    // delete output directory
    if (fs.existsSync(directory)) {
        Terminal.log(`Deleting directory <b>${directory}</b>`);

        for (let filename of fs.readdirSync(directory)) {
            let p = directory + '/' + filename;
            if (fs.lstatSync(p).isDirectory()) {
                deleteDirectory(p);
            } else {
                fs.unlinkSync(p);
            }
        }

        fs.rmdirSync(directory);
    }
}