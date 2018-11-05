# High Performance Genome Visualizer

## Getting Started

The genome visualizer can be used to explore individual genomic files (such as bigwig or BAM) or a collection of files via the [preprocessing script](#Using-the-Preprocessing-Script)

The quickest way to get started is to use [`hpgv.js`](https://raw.githubusercontent.com/VALIS-software/High-Performance-Genome-Visualizer/master/dist/hpgv.js?token=ADkdENDxMTYiHKUCsbbAxUHGeMXPJD8qks5b6czowA%3D%3D) available in the `/dist` folder of this repository
- Download a copy of [hpgv.js](https://raw.githubusercontent.com/VALIS-software/High-Performance-Genome-Visualizer/master/dist/hpgv.js?token=ADkdENDxMTYiHKUCsbbAxUHGeMXPJD8qks5b6czowA%3D%3D) from this repository
- Create a HTML file, inside it load `hpgv.js` and create an element to contain the app
```html
<div id="container"></div>
<script src="hpgv.js"></script>
```
- The visualizer can then be initialized:
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
    }],
});
```
- The visualizer can be displayed by calling its `render(props, container)` method:
```javascript
browser.render(
    {
        width: window.innerWidth,
        height: window.innerHeight
    },
    document.getElementById('container')
);
```

Opening the HTML you created should show

<img alt="Genome Visualizer Demo" src="https://user-images.githubusercontent.com/3742992/48023087-bd94e180-e134-11e8-931c-e9b946dfc1f4.png">


## Using the Preprocessing Script
*todo*

## Getting Started with TypeScript
(see examples/typescript)

*todo*
