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

Finally we run [parcel](https://parceljs.org) on `index.html` to compile the project. Since parcel was installed locally, we can use [`npx`](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) to execute it. In your shell, execute the following:

```bash
npx parcel index.html
```

Once that command completes you should see
```bash
Server running at http://localhost:1234
```

If you open `http://localhost:1234` in your browser you should see HPGV (with the same appearance as in the JavaScript getting-started example)

You cannot normally load a `.ts` file from a `<script>` tag as we've done in `index.html`, to make it possible [parcel](https://parceljs.org) is first compiling `App.ts` to JavaScript and then serving a modified `index.html` that loads this file instead. To generate the final `index.html` and `App.js` files we can use parcel's [`build`](https://parceljs.org/production.html) command:

```bash
npx parcel build index.html --public-url '.'
```

This will write generated files to a folder named `dist/`.

See [examples/typescript](examples/typescript) for a completed example

## Creating a Custom Track: Dual Signal Track

In this tutorial we demonstraight creating a custom track type that enables two bigwig signals to be overlaid on one another. To begin, first follow the [Getting Started with TypeScript](#Getting-Started-with-TypeScript) instructions (or use the existing [example project](examples/typescript)).

The implementation of HPGV tracks is divided over 3 components:
- A [TrackModel](src/track/TrackModel.ts) type to define the track's configuration (optional)
- A [TileLoader](src/track/TileLoader.ts) instance to handle data fetching
- A [TrackObject](src/track/TrackObject.ts) instance to handle rendering the tiles

When all three components have been defined we can register the track type with HPGV by calling `registerTrackType`:

```typescript
GenomeVisualizer.registerTrackType('our-custom-track', OurCustomTileLoader, OurCustomTrackObject);
```

### Defining our TrackModel

The [TrackModel](src/track/TrackModel.ts) serves as a definition for the configuration values the track requires. It's purely used to provide type definitions in TypeScript, so when developing custom tracks in JavaScript it is not required.

For our dual signal track, we only require one addition configuration field: `path2`, to specify the second bigwig file. We can extend the existing [signal track model](src/track/signal/SignalTrackModel.ts).

In a file called `DualSignalTrackModel.ts`:
```typescript
import { SignalTrackModel } from "genome-visualizer";

export type DualSignalTrackModel = SignalTrackModel & {
    // override the 'type' field, this will be the track type identifier used within HPGV
    readonly type: 'dual-signal',
    // we add extra field 'path2' to supply the second bigwig file
    readonly path2: string,
}
```

### Creating our Custom TileLoader

HPGV tracks work by loading data in segments called 'tiles'. To adaptively display data at different zoom levels, multiple layers of tiles are used – tile layers are organized into a hierarchy where successive levels fetch the data at lower sampling densities. For example, the bottom tile layer (maximum zoom) will have a one-to-one correspondence between source data and values in the tile, however the next layer up will aggregate values so that every two values in the source data corresponds to one value in the tile. This pattern of halving the sampling rate with each tile layer continues until all the source data is aggregated into a single value.

For our custom [TileLoader](src/track/TileLoader.ts) we want to load two bigwig files into each tile. Since the existing signal track can handle loading bigwigs, we can use it as a starting point by extending the [SignalTileLoader](src/track/signal/SignalTileLoader.ts) class:

```typescript
import { SignalTileLoader, SignalTilePayload, Tile } from 'genome-visualizer';
import { DualSignalTrackModel } from './DualSignalTrackModel';

export class DualSignalTileLoader extends SignalTileLoader {

    protected readonly model: DualSignalTrackModel;

    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload> {
        return null;
    }

}
```

## Creating a Custom Track: Custom Interval Source

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