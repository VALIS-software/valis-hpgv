import Terminal from "./Terminal";
import * as fs from "fs";
import * as path from "path";
import { deleteDirectory } from "./FileSystemUtils";
import { gff3Convert } from "./gff3/Convert";

const outputDirectory = '_output';

let userArgs = process.argv.slice(2);

let inputPath = userArgs[0];

if (inputPath == null) {
	printDoc();
	process.exit(1);
}

// delete any existing output
deleteDirectory(outputDirectory);
fs.mkdirSync(outputDirectory);

let filePaths = fs.readdirSync(inputPath).map((p) => `${inputPath}/${p}`);

// build a chain of promises to convert the files
// this ensures file conversion is sequential rather than parallel (which improves logging)
let processAllPromise: Promise<string | null | void> = Promise.resolve();
for (let filePath of filePaths) {
	processAllPromise = processAllPromise.then(() => processFile(filePath));
}

function processFile(filePath: string): Promise<string | null> {
	let ext = path.extname(filePath).toLowerCase();

	switch (ext) {
		case '.gff3': {
			return gff3Convert(filePath, outputDirectory);
		}
		case '.fa':
		case '.fasta': {
			Terminal.warn(`FASTA not yet implemented`);
			return Promise.resolve(null);
		}
		default: {
			Terminal.warn(`Unknown file type "${ext}" for "${filePath}"`);
			return Promise.resolve(null);
		}
	}
}

function printDoc() {
	Terminal.writeLineFormatted(
`<b>VALIS Genomic File Preprocessor</b>

Usage: ≤dim>*todo*</>

Supports <b,i>.fasta</> and <b,i>.gff3</> files
`
	);
}