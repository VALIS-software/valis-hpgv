import { GenomeVisualizer } from "genome-visualizer";
import { DualSignalTileLoader } from "./dual-signal/DualSignalTileLoader";

// GenomeVisualizer.registerTrackType('dual-signal', DualSignalTileLoader, )

let hpgv = new GenomeVisualizer({
    allowNewPanels: true,
    panels: [
        {
            location: { contig: 'chr1', x0: 0, x1: 249e6 }
        }
    ],
    tracks: [
        {
            name: 'DNA',
            type: 'sequence',
            path: 'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.vdna-dir',
        },
        {
            name: 'Genes',
            type: 'annotation',
            compact: true,
            path: 'https://s3-us-west-1.amazonaws.com/valis-file-storage/genome-data/GRCh38.92.vgenes-dir',
        },
        {
            name: 'Cerebellum, DNase',
            type: 'signal',
            path: "https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig",
            heightPx: 150,
        },
    ],
});

let container = document.getElementById('container');

window.addEventListener('resize', update);

function update() {
    hpgv.render({
        width: window.innerWidth,
        height: window.innerHeight
    }, container);
}

update();