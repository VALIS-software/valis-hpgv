# VALIS High Performance Genome Visualizer

## [Live Demo](https://valis-software.github.io/valis-hpgv/examples/minimal/index.html)

## Getting Started

The genome visualizer can be used to explore individual genomic files (such as bigwig or BAM) or a collection of files via the [preprocessing script](#Using-the-Preprocessing-Script)

The quickest way to get started is to use [`valis-hpgv.js`](dist/valis-hpgv.js) available in the [`/dist`](dist/) folder of this repository
- Download a copy of [valis-hpgv.js](dist/valis-hpgv.js) from this repository
- Create a HTML file, inside it load `valis-hpgv.js` and create an element to contain the app
```html
<div id="container"></div>
<script src="valis-hpgv.js"></script>
```

- The visualizer can then be initialized with a list of files. The current supported file types are: `bigWig`, `bigBed`, `vdna-dir`, `vgene-dir` with more types including `BAM`, `gff3` and `VCF` planned in the [roadmap](#Roadmap):
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

<img alt="VALIS Genome Visualizer Demo" src="https://user-images.githubusercontent.com/3742992/49345571-97ecf080-f67e-11e8-92f5-b05e46340b9a.png">

[Live Demo](https://valis-software.github.io/valis-hpgv/examples/minimal/index.html)

See [examples/minimal/index.html](examples/minimal/index.html) for a completed example

## Available Example Files
VALIS hosts a number of preprocessed files to help with testing. To create your own, see the section [Using the Preprocessing Script](#Using-the-Preprocessing-Script-to-Visualize-a-Collection-of-Files). To use the following files, right click, select "Copy link address" and then paste into the list of files use to initialize HPGV (see [Getting Started](#Getting-Started))

| DNA | Genes |
|-------|-------|
| [GRCh38.vdna-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.vdna-dir) | [GRCh38.92.vgenes-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.92.vgenes-dir) |
| [GRCh37.vdna-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh37.vdna-dir) | [GRCh37.87.vgenes-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh37.87.vgenes-dir) |
| [Arabidopsis_thaliana.TAIR10.vdna-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/Arabidopsis_thaliana.TAIR10.vdna-dir) | [Arabidopsis_thaliana.TAIR10.59.vgenes-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/Arabidopsis_thaliana.TAIR10.59.vgenes-dir) |
| [Sorghum_bicolor.Sorghum_bicolor_NCBIv3.vdna-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/Sorghum_bicolor.Sorghum_bicolor_NCBIv3.vdna-dir) | [Sorghum_bicolor.Sorghum_bicolor_NCBIv3.59.vgenes-dir](https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/Sorghum_bicolor.Sorghum_bicolor_NCBIv3.59.vgenes-dir) |

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

For our dual signal track, we want the same model as `signal` tracks have but with one addition configuration field: `path2`, to specify the second bigwig file.

In a file called `DualSignalTrackModel.ts`:
```typescript
import { TrackModel } from "genome-visualizer";

export type DualSignalTrackModel = TrackModel & {
    // the type field corresponds to the track type identifier used within HPGV
    readonly type: 'dual-signal',
    // paths to bigwig files
    readonly path: string,
    readonly path2: string,
}
```

### Creating our Custom TileLoader

HPGV tracks work by loading data in segments called 'tiles'. To adaptively display data at different zoom levels, multiple layers of tiles are used – tile layers are organized into a hierarchy where successive levels fetch the data at lower sampling densities. For example, the bottom tile layer (maximum zoom) will have a one-to-one correspondence between source data and values in the tile, however the next layer up will aggregate values so that every two values in the source data corresponds to one value in the tile. This pattern of halving the sampling rate with each tile layer continues until all the source data is aggregated into a single value.

For our custom [TileLoader](src/track/TileLoader.ts) we want to load two bigwig files into each tile. Since the existing signal track can handle loading bigwigs, we can use it as a starting point by extending the [SignalTileLoader](src/track/signal/SignalTileLoader.ts) class. [SignalTileLoader](src/track/signal/SignalTileLoader.ts) uses a WebGL texture to store signal values. A WebGL texture can have 4 values per texture cell – these correspond to 'red', 'green', 'blue' and 'alpha' channels. With a single signal track, only the 'red' channel is used, in our extension we want to store the second bigwig signal into the 'green' channel.

```typescript
import { TileLoader, IDataSource, SignalTileLoader, TrackModel, TextureFormat, SignalTilePayload, GPUTexture, GPUDevice, Tile } from 'genome-visualizer';
import { DualSignalTrackModel } from './DualSignalTrackModel';

export class DualSignalTileLoader extends SignalTileLoader {

    protected bigWigLoader2: any;

    static cacheKey(model: any) {
        // for correct model-tile caching, we must define a cache key that's unique to a given model's tile data
        return model.path + '\x1f' + model.path2;
    }

    // when initializationPromise() completes, the tile loader is considered 'ready' to load tiles
    // we should delay completing initialization until the second bigwig header has loaded
    protected initializationPromise() {
        return Promise.all([
            super.initializationPromise(),
            this.getBigWigLoader((this.model as any as DualSignalTrackModel).path2).then((loader) => {
                this.bigWigLoader2 = loader;
            })
        ]).then(() => { });
    }

    // loadPayloadBuffer(tile) returns an array buffer containing signal data corresponding to a given tile
    // we override this method to also load and add our second signal's data
    protected loadPayloadBuffer(tile: Tile<SignalTilePayload>): Promise<Float32Array> {
        // load the first bigwig tile
        return super.loadPayloadBuffer(tile)
            // then load the second bigwig tile into the same buffer as the first (which is returned from the first's promise)
            .then(
                (buffer) => this.getBigWigData(
                    this.bigWigLoader2,
                    tile,
                    buffer,
                    this.nChannels,
                    1
                )
            );
    }

}
```

### Rendering: Creating our Custom TrackObject

Once we've created a [TileLoader](src/track/TileLoader.ts), we need a [TrackObject](src/track/TrackObject.ts) to render the tiles. For this dual signal example we can use the existing signal track class and extend it to display two signals. A [TrackObject](src/track/TrackObject.ts) displays tile data via tile objects, in [SignalTrack.ts](src/track/signal/SignalTrack.ts) there's a class called [SignalTile](src/track/signal/SignalTrack.ts) which is used to draw a single tile. We extend [SignalTrack](src/track/signal/SignalTrack.ts) and change the `customTileNodeClass` field to refer to our custom tile class we'll call `DualSignalTile`.

To draw two signal tracks we override the value of `signalRGBA` in our extension of [SignalTile](src/track/signal/SignalTrack.ts). `signalRGBA` contains WebGL shader code that decides the color of pixel given the corresponding tile data and pixel's coordinates. `signalRGB` takes the signal values in the texture data and turns it into an RGBA value to draw an image. The [default implementation](https://github.com/VALIS-software/valis-hpgv/blob/cd18c3bcf0f145410cd56fea633b8d0bf99b9fbe/src/track/signal/SignalTrack.ts#L349) look like this

```glsl
vec4 signalRGBA(vec4 textureSample) {
    float signalAlpha = antialiasedSignalAlpha(textureSample.r);
    return vec4(signalColor, signalAlpha);
}
```

A simple alternative would be to just convert the texture input values directly into colors:
```glsl
vec4 signalRGBA(vec4 textureSample) {
    return vec4(textureSample.r, textureSample.g, 0., 1.);
}
```

This will draw red where the first signal is > 0 and green where the second signal is > 0:

<img alt="Dual signal track bands" src="https://user-images.githubusercontent.com/3742992/59980911-5f9a0900-95f4-11e9-8599-c7261b4aeaf5.png">

To draw the signal as a curve we need to transform the signal values so that an opaque color is return when below a threshold and clear is returned when above – a help function `antialiasedSignalAlpha(value)` exists to do this.

In a file called `DualSignalTrack.ts`:

```typescript
import { SignalTile, SignalTrack, Shaders } from "genome-visualizer";
import { DualSignalTrackModel } from "./DualSignalTrackModel";

export class DualSignalTrack extends SignalTrack<DualSignalTrackModel> {

    constructor(model: DualSignalTrackModel) {
        super({ ...model });

        this.customTileNodeClass = DualSignalTile;

        // don't show signal readings on hover
        this.showSignalReading = false;
    }

    // we override the maxValue method so that the green channel is accounted for when auto scaling 
    protected maxValue(r: number, g: number, b: number, a: number) {
        let max = -Infinity;
        if (isFinite(r)) max = Math.max(r, max);
        if (isFinite(g)) max = Math.max(g, max);
        return max;
    }

}

class DualSignalTile extends SignalTile {

    protected signalRGBA = `
        // this function returns the signal image given signal values from the texture
        vec4 signalRGBA(vec4 textureSample) {
            // uncomment the following line to see the raw signal data
            // return vec4(textureSample.rg, 0., 1.);

            float signalAlpha1 = antialiasedSignalAlpha(textureSample.r);
            float signalAlpha2 = antialiasedSignalAlpha(textureSample.g);

            // red signal
            vec4 signal1 = vec4(vec3(1., 0., 0.) * signalAlpha1, signalAlpha1);

            // green signal
            vec4 signal2 = vec4(vec3(0., 1., 0.) * signalAlpha2, signalAlpha2);

            // add the two signals together
            // we could perform more other operations here to help study the data
            // for example, we could multiply the signals to find overlapping regions

            return signal1 + signal2;
        }
    `;

}
```

### Testing our Custom Track

To make our new track type available we call `GenomeVisualizer.registerTrackType` before calling `new GenomeVisualizer` in `App.ts`:

```typescript
GenomeVisualizer.registerTrackType('dual-signal', DualSignalTileLoader, DualSignalTrack);

let hpgv = new GenomeVisualizer({
...
```

And add an instance of the track to the configuration

```typescript
{
    name: 'Dual Signal',
    type: 'dual-signal',
    path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
    path2: 'https://www.encodeproject.org/files/ENCFF677VKI/@@download/ENCFF677VKI.bigWig',
}
```

After running `parcel index.html`, you should see the following when visiting [`http://localhost:1234`](http://localhost:1234). To generate the final index.html and App.js files we can use parcel's build command:

npx parcel build index.html --public-url '.'

<img alt="Dual signal track demo" src="https://user-images.githubusercontent.com/3742992/59981120-2c0cae00-95f7-11e9-9d40-5c4785948c58.png">

[Live Demo](https://valis-software.github.io/valis-hpgv/examples/custom-track-dual-signal/dist/index.html)

The red curve shows the first bigwig and the green the second. The yellow curve corresponds the overlap of the two signals.

See [examples/custom-track-dual-signal](examples/custom-track-dual-signal) for a completed example.

## Creating a Custom Track: Custom Interval Source

Data displayed in HPGV doesn't need to come from static files, it's possible to display data loaded dynamically from an API. Interval data is fetched in segments call 'tiles' and it's requested within the method `getTilePayload(tile)` of a track's tile-loader class. In this example we will extend [IntervalTileLoader](src/track/interval/IntervalTileLoader.ts) and override `getTilePayload` with a method that fetches intervals from an API. `getTilePayload` should return a promise to an object with the type:

```typescript
type IntervalTilePayload = {
    intervals: Float32Array,
    userdata?: any
}
```

Where `intervals` is an array of intervals, for example:

```javascript
new Float32Array([
    startIndex0, length0, // first interval
    startIndex1, length1, // second interval
    ...
    startIndexN, lengthN  // nth interval
]);
```

And `userdata` contains any extra data we might want to use when rendering.

Assuming we have an API method to load intervals with the following signature:
```typescript
loadTiles(contig: {
    contig: string,
    startIndex: number,
    span: number,
    lodLevel: number,
}): Promise<{intervals: Float32Array}>
```

Then we can use it as follows, in a file named `CustomIntervalTileLoader.ts`:

```typescript
export class CustomIntervalTileLoader extends IntervalTileLoader {
    
    protected getTilePayload(tile: Tile<IntervalTilePayload>): Promise<IntervalTilePayload> {
        return api.loadTiles(
            {
                // the tile object tells us the contig and range of data requested, including the level of detail it was requested at
                contig: this.contig,
                startIndex: tile.x,
                span: tile.span,
                lodLevel: tile.lodLeve,
            }
        );
    }

}
```

Then to make our new track type available we call `GenomeVisualizer.registerTrackType` before calling `new GenomeVisualizer` in `App.ts`:

```typescript
GenomeVisualizer.registerTrackType('custom-interval', CustomIntervalTileLoader, IntervalTrack);

let hpgv = new GenomeVisualizer({
...
```

By default [IntervalTileLoader](src/track/interval/IntervalTileLoader.ts) has two levels of detail, specified by `microLodThreshold`, `macroLodLevel`. We can control the level-of-detail granularity by overriding `mapLodLevel(level)` and specifying our own function to alias levels together.

## Using the Preprocessing Script to Visualize a Collection of Files
The preprocessing script is used to prepare common genomics formats for optimal visualization with HPGV. Currently this preprocessing is required for sequence and annotation tracks but not signal tracks.

Put the files you want to convert and visualize together in a directory

`npx hpgv <path to your directory>`

This will generate a new directory named `hpgv-files` which contains the converted files ready for viewing in HPGV.

The tool is currently a WIP so expect improvements soon!


## Roadmap
Support for displaying popular file types out of the box
- `BAM`
- `VCF`
- `GFF3`

Support for new track types
- `interval`
- `variant`
