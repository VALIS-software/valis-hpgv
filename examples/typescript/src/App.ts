import * as ReactDOM from "react-dom";
import { GenomeBrowser } from "genome-browser";

let browser = new GenomeBrowser({
    panels: [{ location: { contig: 'chr1', x0: 0, x1: 249e6 } }],
    tracks: [{ model: { name: 'GRCh38', type: 'sequence' }, heightPx: 100 }],
});

let container = document.getElementById('root');

window.addEventListener('resize', update);

update();

function update() {
    ReactDOM.render(browser.render({
        width: window.innerWidth,
        height: window.innerHeight
    }), container);
}