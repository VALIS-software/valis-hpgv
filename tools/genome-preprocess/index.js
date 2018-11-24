#!/usr/bin/env node

// execute Main
const outDir = './dist'; // from tsconfig
const mainPath = 'tools/genome-preprocess/src/Main'; // relative to rootDir
require(`${outDir}/${mainPath}`); 