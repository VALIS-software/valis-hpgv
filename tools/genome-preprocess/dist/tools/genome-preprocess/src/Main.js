"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Terminal_1 = require("./Terminal");
const fs = require("fs");
const path = require("path");
const FileSystemUtils_1 = require("./FileSystemUtils");
const Convert_1 = require("./gff3/Convert");
const outputDirectory = 'hpgv-files';
let userArgs = process.argv.slice(2);
if (userArgs.length === 0) {
    printDoc();
    process.exit(1);
}
// delete any existing output
FileSystemUtils_1.deleteDirectory(outputDirectory);
fs.mkdirSync(outputDirectory);
let filePaths = new Array();
// get list of files to convert from user arguments
let inputPath = userArgs[0];
let inputStat = fs.lstatSync(inputPath);
if (inputStat.isDirectory()) {
    filePaths = fs.readdirSync(inputPath)
        // skip hidden files
        .filter((name) => name.charAt(0) !== '.')
        // prepend to get complete relative paths
        .map((p) => `${inputPath}/${p}`)
        // skip directories
        .filter((filePath) => !fs.lstatSync(filePath).isDirectory());
}
else {
    filePaths = [inputPath];
}
Terminal_1.default.log(`Files queued for conversion:\n\t<b>${filePaths.join('\n\t')}</b>`);
// build a chain of promises to convert the files
// this ensures file conversion is sequential rather than parallel (which improves logging)
let processAllPromise = Promise.resolve();
for (let filePath of filePaths) {
    processAllPromise = processAllPromise.then(() => processFile(filePath));
}
function processFile(filePath) {
    let ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.gff3': {
            return Convert_1.gff3Convert(filePath, outputDirectory);
        }
        case '.fa':
        case '.fasta': {
            Terminal_1.default.warn(`FASTA not yet implemented`);
            return Promise.resolve(null);
        }
        default: {
            Terminal_1.default.warn(`Unknown file type "${ext}" for "${filePath}"`);
            return Promise.resolve(null);
        }
    }
}
function printDoc() {
    Terminal_1.default.writeLineFormatted(`<b>VALIS Genomic File Preprocessor</b>

Generates files optimized for viewing with VALIS Genome Visualizer 

<b>Usage:</b> genome-preprocess <dim,i>[path to directory containing files to process]</>

Supports <b,i>.fasta</> and <b,i>.gff3</> files
`);
}
