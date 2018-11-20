#!/usr/bin/env node

// execute Main
const outDir = './_built'; // from tsconfig	
const mainPath = 'tools/genome-preprocess/src/Main'; // relative to rootDir	
require(`${outDir}/${mainPath}`); 