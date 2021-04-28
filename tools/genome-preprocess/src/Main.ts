import Terminal from "./Terminal";
import * as fs from "fs";
import * as path from "path";
import { deleteDirectory } from "./FileSystemUtils";
import { gff3Convert } from "./gff3/Convert";
import { vcfConvert } from "./vcf/Convert";

const outputDirectory = 'hpgv-files';

let userArgs = process.argv.slice(2);

if (userArgs.length === 0) {
	printDoc();
	process.exit(1);
}

// delete any existing output
deleteDirectory(outputDirectory);
fs.mkdirSync(outputDirectory);

let filePaths = new Array<string>();

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
} else {
	// user argument is path to a single file
	filePaths = [inputPath];
}

if (filePaths.length === 0) {
	Terminal.error(`No files found in "${inputPath}" (subdirectories are ignored)`);
	process.exit(1);
}

Terminal.log(`Files queued for conversion:\n\t<i,dim>${filePaths.join('\n\t')}</>`);

// build a chain of promises to convert the files
// this ensures file conversion is sequential rather than parallel (which improves logging)
let processAllPromise: Promise<Array<string> | string | null | void> = Promise.resolve();
for (let filePath of filePaths) {
	processAllPromise = processAllPromise.then(() => processFile(filePath));
}

function processFile(filePath: string): Promise<Array<string> | string | null> {
	let ext = path.extname(filePath).toLowerCase();

	switch (ext) {
		case '.gff3':
		case '.gff2':
		case '.gtf': {
			return gff3Convert(filePath, outputDirectory);
		}
		case '.fa':
		case '.fna':
		case '.fasta': {
			Terminal.warn(`FASTA not yet implemented`);
			return Promise.resolve(null);
		}
		case '.vcf': {
			return vcfConvert(filePath, outputDirectory);
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

Generates files optimized for viewing with VALIS Genome Visualizer 

<b>Usage:</b> <light_white>hpgv</> <dim,i>[path to directory containing files to process]</>

Supports the following file types
- <b>FASTA</> <i,dim>.fa, .fna, .fasta</>
- <b>GFF3</> <i,dim>.gff3</>
- <b>VCF</4> <i,dim>.vcf</>
`
	);
}