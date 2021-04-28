import { GenomeVisualizer } from "genome-visualizer";
import { DualSignalTileLoader } from "./dual-signal/DualSignalTileLoader";
import { DualSignalTrack } from "./dual-signal/DualSignalTrack";

GenomeVisualizer.registerTrackType('dual-signal', DualSignalTileLoader, DualSignalTrack);

let hpgv = new GenomeVisualizer({
    allowNewPanels: false,
    panels: [
        {
            location: { contig: 'chr1', x0: 0, x1: 249e6 }
        }
    ],
    tracks: [
        {
            name: 'GRCh37',
            type: 'sequence',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vdna-dir',
        },
        {
            name: 'Valis Genes',
            type: 'annotation',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vgenes-dir',
            displayLabels: false,
        },
        {
            name: 'test VCF',
            type: 'variant',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/test.vcf.vvariants-dir',
            displayLabels: false,
        },
        {
            name: 'bigBed',
            type: 'annotation',
            path: 'https://www.encodeproject.org/files/ENCFF609BMS/@@download/ENCFF609BMS.bigBed',
        },
        {
            name: 'bigWig',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
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