import GPUDevice, { ColorSpaceConversion, GPUTexture, TextureDataType, TextureFormat, TextureMagFilter, TextureMinFilter, TextureWrapMode } from "engine/rendering/GPUDevice";
import { SignalTrackModel } from "./SignalTrackModel";

import { BigWigReader, HeaderData } from  "genomic-reader";
import { TileLoader, Tile, TileState } from "../TileLoader";
import { IDataSource } from "../../data-source/IDataSource";
import { Contig, UCSCBig } from "../..";

export type SignalTilePayload = {
    textureUnpackMultiplier: number,
    array: Float32Array,
    sequenceMinMax: {
        min: number,
        max: number,
    };
    dataUploaded: boolean,
    getTexture(device: GPUDevice): GPUTexture;
    getReading(fractionalX: number, channel: number): number;
}

type BlockPayload = {
    _gpuTexture: GPUTexture,
    floatPacking: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

type BigWigLoader = {
    header: HeaderData,
    reader: BigWigReader,
    lodMap: Array<number>,
    lodZoomIndexMap: Array<number | null>,
}

export class SignalTileLoader extends TileLoader<SignalTilePayload, BlockPayload> {

    ready: boolean = false;

    protected bigWigLoader: BigWigLoader;

    protected readonly nChannels = 4;

    static cacheKey(model: SignalTrackModel) {
        return model.path;
    }

    static getAvailableContigs(model: SignalTrackModel): Promise<Array<Contig>> {
        let contigs = new Array<Contig>();
        if (model.path != null) {
            return UCSCBig.getBigLoader(model.path).then(b => UCSCBig.getContigs(b.header));
        }
        return Promise.resolve(contigs);
    }

    static requestIndex = 0;

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: SignalTrackModel,
        protected readonly contig: string
    ) {
        super(2048, 32);

        this.initializationPromise().then(() => {
            this.ready = true;
            this.onReady();
        });
    }

    mapLodLevel(l: number) {
        if (this.ready) {
            if (l >= this.bigWigLoader.lodMap.length) {
                // l is out of range of lookup table, return the top lod
                return this.bigWigLoader.lodMap[this.bigWigLoader.lodMap.length - 1];
            }
            return this.bigWigLoader.lodMap[l];
        } else {
            return l;
        }
    }

    /**
    * Executes callback on every tile value within the range x0 to x1 at a given lod (if the tile has loaded).
    * Successively higher lods are used to fill in missing gaps for tiles that have not yet loaded.
    * If there are no loaded tiles in this range the callback will not fire
    */
    forEachValue(x0: number, x1: number, lodLevel: number, coverGapsWithHigherLevels: boolean, callback: (x: number, r: number, g: number, b: number, a: number, lodLevel: number) => void) {
        let lodDensity = Math.pow(2, lodLevel);
        let lodX0 = Math.floor(x0 / lodDensity);
        let lodX1 = Math.ceil(x1 / lodDensity);

        this.forEachTileAtLod(x0, x1, lodLevel, false, (tile) => {
            if (tile.state === TileState.Complete) {
                let i0 = Math.max(lodX0 - tile.lodX, 0);
                let i1 = Math.min(lodX1 - tile.lodX, tile.lodSpan - 1);

                for (let i = i0; i <= i1; i++) {
                    let x = tile.x + i;
                    let r = tile.payload.array[this.nChannels * i + 0];
                    let g = tile.payload.array[this.nChannels * i + 1];
                    let b = tile.payload.array[this.nChannels * i + 2];
                    let a = tile.payload.array[this.nChannels * i + 3];
                    callback(x, r,g,b,a, lodLevel);
                }
            } else if (coverGapsWithHigherLevels) {
                // we have a gap here, try the next lod
                // find next lod, accounting for lod aliasing by mapLodLevel
                let nextLodLevel = -1;
                for (let l = lodLevel + 1; l <= this.topTouchedLod(); l++) {
                    let mappedLod = this.mapLodLevel(l);
                    if (mappedLod > lodLevel) {
                        nextLodLevel = mappedLod;
                        break;
                    }
                }

                if (nextLodLevel != -1) {
                    this.forEachValue(
                        Math.max(tile.x, x0),
                        Math.min(tile.x + tile.span, x1),
                        nextLodLevel,
                        coverGapsWithHigherLevels,
                        callback
                    );
                } else {
                    // exhausted all lods and found no data that covers the range of this tile
                }
            }
        });
    }

    private _initializationPromise: Promise<void>;
    protected initializationPromise() {
        if (this._initializationPromise == null) {
            this._initializationPromise = this.getBigWigLoader(this.model.path).then((loader) => {
                this.bigWigLoader = loader;
                
                /*
                // determine scale factor
                let maxLod = loader.lodMap[loader.lodMap.length - 1];
                let maxZoomIndex = loader.lodZoomIndexMap[maxLod];

                loader.reader.readZoomData(
                    this.contig,
                    0,
                    this.contig,
                    loader.header.chromTree.chromSize[this.contig],
                    maxZoomIndex,
                ).then(
                (entries) => {
                    // console.log('maxZoom', entries);

                    let maxValue = -Infinity;
                    let maxAvg = -Infinity;
                    for (let entry of entries) {
                        let avg = entry.sumData / entry.validCount;
                        maxAvg = Math.max(avg, maxAvg);
                        maxValue = Math.max(entry.maxVal, entry.maxVal);
                    }

                    let maxValueWeight = 0.0;
                    let maxAverageWeight = 1 - maxValueWeight;

                    let weightedAveraged = maxValue * maxValueWeight + maxAvg * maxAverageWeight;

                    let maxDisparity = maxValue / maxAvg;

                    // this._logarithmicDisplay = maxDisparity > 10;
                    // this._logarithmicDisplay = true;

                    // console.log(maxValue, maxAvg, weightedAveraged);

                    // @! hacky
                    // ideally find some decent mid scale that doesn't necessarily capture all the peaks but makes the overall shape of the data visible
                    // this._dataMultiplier = this._logarithmicDisplay ? (1 / Math.log2(weightedAveraged)) : (1 / (weightedAveraged * 5));
                });
                */
            });
        }

        return this._initializationPromise;
    }

    protected onReady() {
        // preload low-resolution data when we know the size of the contig
        this.dataSource.getContigs().then((contigs) => {
            let contigInfo = contigs.find((c) => c.id === this.contig);
            if (contigInfo != null) {
                let maxX = contigInfo.span - 1;
                let minSpan = 512;
                this.forEachTile(0, maxX, contigInfo.span / minSpan, true, () => { });
            }
        });
    }

    /**
     * Generate a BigWig loader instance for a given BigWig file path
     */
    protected getBigWigLoader(path: string): Promise<BigWigLoader> {
        // we use a custom loader so we can explicitly disable caching (which with range requests is bug prone in many browsers)
        let bigWigReader = new BigWigReader({
            load: (start: number, size?: number) => {
                return new Promise<ArrayBuffer>((resolve, reject) => {
                    let request = new XMLHttpRequest();
                    // disable caching (because of common browser bugs)
                    request.open('GET', path + '?cacheAvoid=' + SignalTileLoader.requestIndex++, true);
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
     * Convert a BigWig zoom levels header into maps so we can lookup the zoom level for any given lod
     */
    protected generateLodLookups(bigWigHeader: HeaderData): {
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

    /**
     * Given a BigWig loader instance, load BigWig data to cover *tile* into texture ArrayBuffer *buffer*.
     * Copies values into *targetChannel* assuming *nChannels* texture channels.
     */
    protected getBigWigData(
        bigWigLoader: BigWigLoader,
        tile: Tile<SignalTilePayload>,
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
                this.contig,
                tile.x,
                this.contig,
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
                this.contig,
                tile.x,
                this.contig,
                tile.x + tile.span,
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

    protected loadPayloadBuffer(tile: Tile<SignalTilePayload>): Promise<Float32Array> {
        let buffer = new Float32Array(tile.lodSpan * this.nChannels);
        return this.getBigWigData(
            this.bigWigLoader,
            tile,
            buffer,
            this.nChannels,
            0
        );
    }

    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload> {
        const nChannels = this.nChannels;
        // fill float array with zoom data regions
        let tileLoader = this;
        return this.loadPayloadBuffer(tile).then((data) => {
            return {
                textureUnpackMultiplier: 1,
                array: data,
                sequenceMinMax: {
                    min: 0,
                    max: 0,
                },
                dataUploaded: false,
                getTexture(device: GPUDevice): GPUTexture {
                    let payload: SignalTilePayload = this;

                    let blockPayload = tileLoader.getBlockPayload(tile);
                    let gpuTexture: GPUTexture = blockPayload.getTexture(device);

                    // upload this tile's row to the block if not already uploaded
                    if (!payload.dataUploaded) {
                        let dataWidthPixels = payload.array.length / nChannels;

                        let data: Uint8Array | Float32Array = payload.array;
                        
                        // convert float32array to bytes, we lose lots of precision but atleast we see something
                        if (blockPayload.floatPacking) {
                            // use the max value to crush array into the 0-1 range and set payload.unpackMultiplier so we can correct when reading from the texture
                            let max = payload.array.reduce((prev, curr, i) => Math.max(prev, curr));
                            payload.textureUnpackMultiplier = max;

                            data = new Uint8Array(payload.array.length);
                            for (let i = 0; i < payload.array.length; i++) {
                                data[i] = (payload.array[i] / max) * 0xFF;
                            }
                        }

                        gpuTexture.updateTextureData(
                            0,
                            TextureFormat.RGBA,
                            data,
                            0, tile.blockRowIndex, // x, y
                            Math.min(gpuTexture.w, dataWidthPixels), 1, // w, h
                        );

                        // console.log(`%cupload row: ${tile.blockRowIndex}, key: ${tile.key}`, 'color: green');

                        payload.dataUploaded = true;
                    }

                    return gpuTexture;
                },
                /**
                 * Where 0 corresponds to the first value in the tile and 1, the last
                 * This is design to mirror the behavior of `texture2D` in GLSL
                 */
                getReading(u: number, channel: number) {
                    let payload: SignalTilePayload = this;
                    
                    let nEntries = tile.lodSpan;
                    let linearFiltering = tile.lodLevel > 0;

                    if (linearFiltering) {
                        let p = Math.max(u * nEntries - 0.5, 0);
                        let low = payload.array[Math.floor(p) * nChannels + channel];
                        let high = payload.array[Math.min(Math.ceil(p), nEntries - 1) * nChannels + channel];
                        let alpha = p - Math.floor(p);

                        return (low * (1 - alpha) + high * alpha);
                    } else {
                        let i = Math.floor(u * nEntries);
                        return payload.array[i * nChannels + channel]; // red channel
                    }
                }
            }
        });
    }

    protected createBlockPayload(lodLevel: number, lodX: number, tileWidth: number, rows: number): BlockPayload {
        return {
            _gpuTexture: null,
            floatPacking: false,
            getTexture(device: GPUDevice) {
                let payload: BlockPayload = this;

                // allocate texture if it doesn't already exist
                if (payload._gpuTexture === null) {
                    // console.log(`%ccreate texture ${lodLevel}`, 'color: blue');

                    // use float packing if float textures are not supported
                    let floatSupported = device.capabilities.floatTextures;
                    let linearFilteringSupported = floatSupported ? device.capabilities.floatTexturesLinearFiltering : true;
                    payload.floatPacking = !floatSupported;

                    payload._gpuTexture = device.createTexture({
                        format: TextureFormat.RGBA,

                        // mipmapping should be turned off to avoid rows blending with one another
                        // if TILES_PER_BLOCK = 1 then mipmapping may be enabled
                        generateMipmaps: false,

                        // FireFox emits performance warnings when using texImage2D on uninitialized textures
                        // in our case it's faster to let the browser zero the texture rather than allocating another array buffer
                        mipmapData: null, //[new Uint8Array(BLOCK_SIZE * nChannels)],
                        width: tileWidth,
                        height: rows,
                        dataType: floatSupported ? TextureDataType.FLOAT : TextureDataType.UNSIGNED_BYTE,

                        samplingParameters: {
                            magFilter: (lodLevel > 0 && linearFilteringSupported) ? TextureMagFilter.LINEAR : TextureMagFilter.NEAREST,
                            minFilter: TextureMinFilter.LINEAR,
                            wrapS: TextureWrapMode.CLAMP_TO_EDGE,
                            wrapT: TextureWrapMode.CLAMP_TO_EDGE,
                        },

                        pixelStorage: {
                            packAlignment: 1,
                            unpackAlignment: 1,
                            flipY: false,
                            premultiplyAlpha: false,
                            colorSpaceConversion: ColorSpaceConversion.NONE,
                        },
                    });
                }

                return payload._gpuTexture;
            }
        }
    }

    protected releaseBlockPayload(payload: BlockPayload) {
        if (payload._gpuTexture != null) {
            payload._gpuTexture.delete();
            payload._gpuTexture = null;
        }
    }

}