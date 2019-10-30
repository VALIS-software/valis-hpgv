const GV = require('../../dist/valis-hpgv.js');

function handleTest() {
    console.log('we are handling the test');
}

// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let config = {
    allowNewPanels: true,
    highlightLocation: 'chr1:54877700',
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
            name: 'bigWig',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF985ZQU/@@download/ENCFF985ZQU.bigWig',
        }
    ],
};

let hpgv = new GV.GenomeVisualizer(config);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));