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
let browser = new GenomeBrowser([
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
browser.render(
    {
        width: window.innerWidth,
        height: window.innerHeight
    },
    document.getElementById('container')
);
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
See [examples/typescript](examples/typescript) for a completed example

If you're intending to extend and customize HPGV the best way to do that is to use TypeScript. HPGV's is written in TypeScript and provides type definition files, type definitions will help catch errors when using the HPGV API and make your project easier to maintain.

### Prerequisites
- Install [node.js](https://nodejs.org/en/) (either latest or current), this installs the `npm` command used in the tutorial

Create a directory to contain the project, open up a command shell to directory (for example, using "Command Prompt" on Windows or "Terminal" on macOS).

### Install Dependencies

First we need to create a `package.json` to manage dependencies, the following command will create a default `package.json`

`npm init -y`

Then we install HPGV as a dependency

`npm install github:VALIS-software/valis-hpgv --save`

This will create a `node_modules` folder containing VALIS HPGV and associated dependencies, the `--save` flag ensures this dependency is recorded in `package.json`.

Next we install the `parcel` tool which we will use to build the project

`npm install parcel --save-dev`

### Create Project Files

We create a TypeScript file named `App.ts` which will be used to initialize and interact with HPGV.



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