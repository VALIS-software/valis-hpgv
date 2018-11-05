import * as ReactDOM from "react-dom";
import { GenomeBrowser } from "genome-visualizer";

let browser = new GenomeBrowser(
    {
        panels: [{ location: { contig: 'chr1', x0: 0, x1: 249e6 } }],
        tracks: [{ name: 'GRCh38', type: 'sequence' }],
    },
    './manifest.json'
);

let container = document.getElementById('root');

window.addEventListener('resize', update);

update();

function update() {
    browser.render({
        width: window.innerWidth,
        height: window.innerHeight
    }, container);
}