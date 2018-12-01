import { GenomeVisualizer, TileLoader } from "genome-visualizer";
import { DualSignalTileLoader } from "./dual-signal/DualSignalTileLoader";
import { DualSignalTrack } from "./dual-signal/DualSignalTrack";

GenomeVisualizer.registerTrackType('dual-signal', DualSignalTileLoader, DualSignalTrack);

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
            name: 'Dual Signal',
            type: 'dual-signal',
            path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
            path2: 'https://www.encodeproject.org/files/ENCFF677VKI/@@download/ENCFF677VKI.bigWig',
        }
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