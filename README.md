# VALIS High Performance Genome Visualizer

## Getting Started

The genome visualizer can be used to explore individual genomic files (such as bigwig or BAM) or a collection of files via the [preprocessing script](#Using-the-Preprocessing-Script)

The quickest way to get started is to use [`valis-hpgv.js`](https://raw.githubusercontent.com/VALIS-software/High-Performance-Genome-Visualizer/master/dist/valis-hpgv.js?token=ADkdENDxMTYiHKUCsbbAxUHGeMXPJD8qks5b6czowA%3D%3D) available in the `/dist` folder of this repository
- Download a copy of [valis-hpgv.js](https://raw.githubusercontent.com/VALIS-software/High-Performance-Genome-Visualizer/master/dist/valis-hpgv.js?token=ADkdENDxMTYiHKUCsbbAxUHGeMXPJD8qks5b6czowA%3D%3D) from this repository
- Create a HTML file, inside it load `valis-hpgv.js` and create an element to contain the app
```html
<div id="container"></div>
<script src="valis-hpgv.js"></script>
```

- The visualizer can then be initialized with a list of files. The current supported file types are: `bigwig`, `vdna-dir`, `vgene-dir` with more types including `BAM`, `gff3` and `VCF` planned in the [roadmap](#Roadmap):
```javascript
// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let hpgv = new GenomeVisualizer([
    // GRCh38 DNA sequence
    'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.vdna-dir',
    // GRCh38 genes
    'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.92.vgenes-dir',
    // Cerebellum, DNase
    'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
]);
```

- Once initialized, the visualizer can be then displayed by calling its `render(props, container)` method:
```javascript
hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));
```

Opening the HTML you created should now show

<img alt="VALIS Genome Visualizer Demo" src="https://user-images.githubusercontent.com/3742992/48793189-1300ef00-ecee-11e8-898e-a599d538b2a4.png">

See [examples/minimal/index.html](examples/minimal/index.html) for a completed example

### Advanced Configuration

For more control, you can configure panels and track properties on initialization:
```javascript
let browser = new GenomeBrowser({
    // set the view to display chr1 covering bases 0 to 249 million
    panels: [{
        location: { contig: 'chr1', x0: 0, x1: 249e6 }
    }],
    // display a bigwig file as the only track
    tracks: [{
        type: 'signal',
        name: 'Bigwig',
        path: 'https://s3.amazonaws.com/igv.broadinstitute.org/data/hg19/encode/wgEncodeBroadHistoneGm12878H3k4me3StdSig.bigWig',
        heightPx: 250
    }],
});
```

The available track types are
- `sequence`
- `signal`
- `annotation`

See [examples/advanced/index.html](examples/advanced/index.html) for a completed example

## Getting Started with TypeScript

If you're intending to extend and customize HPGV the best way to do that is to use TypeScript. HPGV's is written in TypeScript and provides type definition files, type definitions will help catch errors when using the HPGV API and make your project easier to maintain.

### Prerequisites
- Install [node.js](https://nodejs.org/en/) (either latest or current), this installs the `npm` command used in the tutorial

First create a directory to contain the project, open up a command shell to directory (for example, using [Command Prompt](https://www.digitalcitizen.life/command-prompt-how-use-basic-commands) on Windows or [Terminal](https://macpaw.com/how-to/use-terminal-on-mac) on macOS).

From this shell we can then install HPGV (this repository) as a dependency and [parcel](https://parceljs.org) which is used to build the project.

The following commands will create a `package.json` (used to manage dependencies) and install HPGV and [parcel](https://parceljs.org).

```bash
npm init -y
npm install github:VALIS-software/valis-hpgv --save
npm install parcel --save-dev
```

### Create Project Files

The structure of the project will be the following:
```
App.ts
index.html
package.json
node_modules/
```

We created `package.json` and `node_modules` when installing dependencies. Now we need entry point to the app which will initialize and interact with HPGV, to do this we create a file named `App.ts`.

In `App.ts` will add the same getting-started code from the JavaScript example, however we also prepend an import statement which will load the type definitions for HPGV and enable the type-checking.

```TypeScript
import { GenomeVisualizer } from 'genome-visualizer';

// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let hpgv = new GenomeVisualizer([
    // GRCh38 DNA sequence
    'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.vdna-dir',
    // GRCh38 genes
    'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.92.vgenes-dir',
    // Cerebellum, DNase
    'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
]);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));
```

We need a html file to host the app, let's name this file 
`index.html` and its contents will be:

```html
<div id="container"></div>
<script src="./App.ts"></script>
```

### Build and Test

Finally we run [parcel](https://parceljs.org) on `index.html` to compile the project. Since parcel was installed locally, we can use [`npx`](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) to execute it`. In your shell, execute the following:

```bash
npx parcel index.html
```

Once that command completes you should see
```bash
Server running at http://localhost:1234
```

If you open `http://localhost:1234` in your browser you should see HPGV (with the same appearance as in the JavaScript getting-started example)

When parcel first runs it will install the TypeScript compiler as a local dependency.

See [examples/typescript](examples/typescript) for a completed example

## Creating a Custom Track – Multiple Signal Track
Begin by following the steps to create a TypeScript project (however the principles are the same)

## Creating a Custom Track – Custom Interval Source

## Using the Preprocessing Script to Visualize a Collection of Files
The preprocessing script is used to prepare common genomics formats for optimal visualization with HPGV. Currently this preprocessing is required for sequence and annotation tracks but not signal tracks.

Put the files you want to convert and visualize together in a directory

`npx hpgv <path to your directory>`

This will generate a new directory named `hpgv-files` which contains the converted files ready for viewing in HPGV


## Roadmap
Support for displaying popular file types out of the box
- `BAM`
- `VCF`
- `GFF3`

Support for new track types
- `interval`
- `variant`