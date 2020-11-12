import { BigWigReader, HeaderData } from "genomic-reader";
import { Tile } from "../track";

export type BigLoader = {
    header: HeaderData,
    reader: BigWigReader,
    lodMap: Array<number>,
    lodZoomIndexMap: Array<number | null>,
}

export class UCSCBig {

    /**
     * Generate a BigWig loader instance for a given BigWig file path
     */
    private static _requestIndex = 0;
    static getBigLoader(path: string, forceAvoidCaching = true): Promise<BigLoader> {
        // we use a custom loader so we can explicitly disable caching (which with range requests is bug prone in many browsers)
        let bigWigReader = new BigWigReader({
            load: (start: number, size?: number) => {
                return new Promise<ArrayBuffer>((resolve, reject) => {
                    let request = new XMLHttpRequest();
                    // disable caching (because of common browser bugs)
                    let url = path + (forceAvoidCaching ? ('?cacheAvoid=' + this._requestIndex++) : '');
                    request.open('GET', url, true);
                    request.setRequestHeader('Range', `bytes=${start}-${size ? start + size - 1 : ""}`);

                    request.responseType = 'arraybuffer';
                    request.onloadend = () => {
                        if (request.status >= 200 && request.status < 300) {
                            // success-like response
                            resolve(request.response);
                        } else {
                            // error-like response
                            reject(`HTTP request error: ${request.statusText} (${request.status})`);
                        }
                    }
                    request.send();
                });
            }
        });

        return bigWigReader.getHeader().then((header) => {
            let lookupTables = this.generateLodLookups(header);
            return {
                ...lookupTables,
                header: header,
                reader: bigWigReader,
            };
        });
    }

    /**
     * Given a BigWig loader instance, load BigWig data to cover *tile* into texture ArrayBuffer *buffer*.
     * Copies values into *targetChannel* assuming *nChannels* texture channels.
     */
    static getBigWigDataForTile(
        bigWigLoader: BigLoader,
        contig: string,
        tile: Tile<any>,
        buffer: Float32Array,
        nChannels: number,
        targetChannel: number
    ): Promise<Float32Array> {
        let zoomIndex = bigWigLoader.lodZoomIndexMap[tile.lodLevel];
        let lodDensity = Math.pow(2, tile.lodLevel);

        // @! use for normalization
        // @! review floor in i0, i1

        let dataPromise: Promise<Float32Array>;

        if (zoomIndex !== null) {
            // fetch from zoomed
            dataPromise = bigWigLoader.reader.readZoomData(
                contig,
                tile.x,
                contig,
                tile.x + tile.span, // @! needs checking,
                zoomIndex,
            ).then((zoomData) => {
                // fill buffer with zoom data regions
                for (let entry of zoomData) {
                    let x0 = entry.start - tile.x;
                    let x1 = entry.end - tile.x;
                    let i0 = Math.floor(x0 / lodDensity);
                    let i1 = Math.floor(x1 / lodDensity);

                    // fake norm
                    let value = (entry.sumData / entry.validCount);

                    for (let i = i0; i < i1; i++) {
                        buffer[i * nChannels + targetChannel] = value;
                    }
                }

                return buffer;
            });
        } else {
            // fetch 'raw'
            dataPromise = bigWigLoader.reader.readBigWigData(
                contig,
                tile.x,
                contig,
                tile.x + tile.span, // @! needs checking,
            ).then((rawData) => {
                for (let entry of rawData) {
                    let x0 = entry.start - tile.x;
                    let x1 = entry.end - tile.x;
                    let i0 = Math.floor(x0);
                    let i1 = Math.floor(x1);

                    let value = entry.value;

                    for (let i = i0; i < i1; i++) {
                        if ((i < 0) || (i >= tile.lodSpan)) continue; // out of range
                        buffer[i * nChannels + targetChannel] = value;
                    }
                }

                return buffer;
            });
        }

        return dataPromise;
    }

    static getContigs(header: HeaderData) {
        let contigs = [];
        let availableChromosomes = header.chromTree.idToChrom;
        availableChromosomes.sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        for (let contigId of availableChromosomes) {
            contigs.push({
                id: contigId,
                startIndex: 0,
                span: header.chromTree.chromSize[contigId]
            });
        }
        return contigs;
    }

    /**
     * Convert a BigWig zoom levels header into maps so we can lookup the zoom level for any given lod
     */
    protected static generateLodLookups(bigWigHeader: HeaderData): {
        lodMap: Array<number>,
        lodZoomIndexMap: Array<number>,
    } {
        let reductionLevelToLod = (reductionLevel: number) => Math.floor(Math.log2(reductionLevel));

        let availableLods = bigWigHeader.zoomLevelHeaders.map((h) => reductionLevelToLod(h.reductionLevel));
        availableLods = availableLods.sort((a, b) => a - b); // manual sort method so that javascript doesn't sort our numbers alphabetically X_X

        // lod level 0 should always be available
        if (availableLods[0] !== 0) availableLods.unshift(0);

        let highestLod = availableLods[availableLods.length - 1];

        // fill maps
        let lodMap = new Array(highestLod);
        let lodZoomIndexMap = new Array(highestLod);

        const diffLowerLimit = 2;

        for (let i = 0; i <= highestLod; i++) {

            // find nearest lod either side of i
            for (let j = 0; j < availableLods.length; j++) {
                let l = availableLods[j];
                if (l > i) { // we've found the upper lod
                    let upperLod = l;
                    let lowerLod = availableLods[j - 1];
                    let diffLower = i - lowerLod;
                    let diffUpper = upperLod - i;

                    // pick closest lod
                    // prevent picking lower-lod if the different is too great – this is to prevent performance issues displaying many tiles
                    let bestLod = ((diffLower < diffUpper) && (diffLower <= diffLowerLimit)) ? lowerLod : upperLod;

                    lodMap[i] = bestLod;
                    break;
                }
            }

            // we failed to find an upper lod therefore use highest lod
            if (lodMap[i] === undefined) {
                lodMap[i] = highestLod;
            }


            // find corresponding index for this lod
            let zoomHeaderEntry = bigWigHeader.zoomLevelHeaders.find((h) => reductionLevelToLod(h.reductionLevel) === lodMap[i]);

            if (zoomHeaderEntry == null) {
                lodZoomIndexMap[i] = null;
            } else {
                lodZoomIndexMap[i] = zoomHeaderEntry.index;
            }
        }

        return {
            lodMap: lodMap,
            lodZoomIndexMap: lodZoomIndexMap,
        }
    }

}