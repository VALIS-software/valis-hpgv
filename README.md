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

- The visualizer can then be initialized with a list of files. The current supported file types are: `bigwig`, `vdna-dir`, `vgene-dir` with more types including BAM, gff3 and VCF planned in the [roadmap](#Roadmap):
```javascript
// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let browser = new GenomeBrowser([
    // GRCh38 DNA sequence
    'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.vdna-dir',
    // GRCh38 genes
    'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.vgenes-dir',
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

See [examples/minimal/index.html](examples/minimal/index.html) for a complete example

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

## Using the Preprocessing Script to Visualize a Collection of Files
The preprocessing script is used to prepare common genomics formats for optimal visualation with HPGV

Put the files you want to convert and visualize together in a directory
`npx genome-preprocess <path to your directory>`

This will generate a new directory named `_output` which contains the converted files ready for viewing in HPGV

**todo: Flesh out worked example**

## Getting Started with TypeScript
(see examples/typescript)
*todo*

## Creating a Custom Track
*todo - walkthrough extending the TypeScript example*

## Roadmap
Support for displaying popular file types out of the box
- BAM
- VCF
- GFF3