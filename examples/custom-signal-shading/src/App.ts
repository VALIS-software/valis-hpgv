import { GenomeVisualizer, SignalTileLoader } from "genome-visualizer";
import { CustomSignalTrack } from "./CustomSignalTrack";

// override signal track type with our custom track display
GenomeVisualizer.registerTrackType('signal', SignalTileLoader, CustomSignalTrack);

let hpgv = new GenomeVisualizer({
    allowNewPanels: false,
    panels: [
        {
            location: { contig: 'chr1', x0: 0, x1: 249e6 }
        }
    ],
    tracks: [
        {
            name: 'Signal',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
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