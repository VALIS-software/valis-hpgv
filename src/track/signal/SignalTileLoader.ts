import GPUDevice, { ColorSpaceConversion, GPUTexture, TextureDataType, TextureFormat, TextureMagFilter, TextureMinFilter, TextureWrapMode } from "engine/rendering/GPUDevice";
import { SignalTrackModel } from "./SignalTrackModel";

import { BigWigReader, HeaderData } from  "bigwig-reader";
import { TileLoader, Tile } from "../TileLoader";
import { IDataSource } from "../../data-source/IDataSource";

export type SignalTilePayload = {
    array: Float32Array,
    sequenceMinMax: {
        min: number,
        max: number,
    };
    dataUploaded: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

type BlockPayload = {
    _gpuTexture: GPUTexture,
    floatPacking: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

export class SignalTileLoader extends TileLoader<SignalTilePayload, BlockPayload> {

    ready : boolean = false;

    get scaleFactor() {
        return this._scaleFactor;
    }

    protected _scaleFactor: number = 1;
    protected _logarithmicDisplay: boolean = false; // @! needs a proper design pass

    protected header: HeaderData;

    protected lodMap: Array<number>;
    protected lodZoomIndexMap: Array<number | null>;

    protected bigWigReader: BigWigReader;

    static cacheKey(model: SignalTrackModel) {
        return model.path;
    }

    static requestIndex = 0;

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: SignalTrackModel,
        protected readonly contig: string
    ) {
        super(2048, 32);

        // we use a custom loader so we can explicitly disable caching (which with range requests is bug prone in many browsers)
        let loader = {
            load: (start: number, size?: number) => {
                return new Promise<ArrayBuffer>((resolve, reject) => {
                    let request = new XMLHttpRequest();
                    // disable caching (because of common browser bugs)
                    request.open('GET', model.path + '?cacheAvoid=' + SignalTileLoader.requestIndex++, true);
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
        }

        this.bigWigReader = new BigWigReader(loader);
        this.bigWigReader.getHeader().then((header) => {
            this.header = header;
            console.log('Header loaded', header);

            let lookupTables = this.generateLodLookups(header);
            this.lodMap = lookupTables.lodMap;
            this.lodZoomIndexMap = lookupTables.lodZoomIndexMap;

            // determine scale factor
            let maxLod = this.lodMap[this.lodMap.length - 1];
            let maxZoomIndex = this.lodZoomIndexMap[maxLod];

            this.bigWigReader.readZoomData(
                this.contig,
                0,
                this.contig,
                this.header.chromTree.chromSize[this.contig], // @! needs checking,
                maxZoomIndex,
            ).then((entries) => {
                console.log('maxZoom', entries);

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
                this._logarithmicDisplay = false;

                console.log(maxValue, maxAvg, weightedAveraged);

                // @! hacky
                this._scaleFactor = this._logarithmicDisplay ? (1 / Math.log2(weightedAveraged)) : (1 / (weightedAveraged * 5));

                this.ready = true;

                this.onReady();
            });
        });
    }

    mapLodLevel(l: number) {
        if (l >= this.lodMap.length) {
            // l is out of range of lookup table, return the top lod
            return this.lodMap[this.lodMap.length - 1];
        }
        return this.lodMap[l];
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

    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload> {
        let zoomIndex = this.lodZoomIndexMap[tile.lodLevel];
        let lodDensity = Math.pow(2, tile.lodLevel);

        // @! use for normalization
        let dataMultiplier = this._scaleFactor;
        // @! review floor in i0, i1

        let dataPromise: Promise<Float32Array>;

        if (zoomIndex !== null) {
            // fetch from zoomed
            dataPromise = this.bigWigReader.readZoomData(
                this.contig,
                tile.x,
                this.contig,
                tile.x + tile.span, // @! needs checking,
                zoomIndex,
            ).then((zoomData) => {
                // fill float array with zoom data regions
                let nChannels = 4;
                let floatArray = new Float32Array(tile.lodSpan * nChannels);

                for (let entry of zoomData) {
                    let x0 = entry.start - tile.x;
                    let x1 = entry.end - tile.x;
                    let i0 = Math.floor(x0 / lodDensity);
                    let i1 = Math.floor(x1 / lodDensity);

                    // fake norm
                    let value = (entry.sumData / entry.validCount) * dataMultiplier;

                    for (let i = i0; i < i1; i++) {
                        floatArray[i * nChannels] = value;
                    }
                }

                return floatArray;
            });
        } else {
            // fetch 'raw'
            dataPromise = this.bigWigReader.readBigWigData(
                this.contig,
                tile.x,
                this.contig,
                tile.x + tile.span, // @! needs checking,
            ).then((rawData) => {
                // fill float array with zoom data regions
                let nChannels = 4;
                let floatArray = new Float32Array(tile.lodSpan * nChannels);

                for (let entry of rawData) {
                    let x0 = entry.start - tile.x;
                    let x1 = entry.end - tile.x;
                    let i0 = Math.floor(x0);
                    let i1 = Math.floor(x1);

                    let value = entry.value;

                    for (let i = i0; i < i1; i++) {
                        if ((i < 0) || (i >= tile.lodSpan)) continue; // out of range
                        floatArray[i * nChannels] = value * dataMultiplier;
                    }
                }

                return floatArray;
            });
        }

        let tileLoader = this;

        return dataPromise.then((data) => {
            return {
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
                        let nChannels = 4;
                        let dataWidthPixels = payload.array.length / nChannels;

                        let data: Uint8Array | Float32Array = payload.array;
                        
                        // convert float32array to bytes, we lose lots of precision but atleast we see something
                        if (blockPayload.floatPacking) {
                            data = new Uint8Array(payload.array.length);
                            for (let i = 0; i < payload.array.length; i++) {
                                data[i] = payload.array[i] * 0xFF;
                            }
                        }

                        gpuTexture.updateTextureData(
                            0,
                            TextureFormat.RGBA,
                            data,
                            0, tile.blockRowIndex, // x, y
                            Math.min(gpuTexture.w, dataWidthPixels), 1, // w, h
                        );

                        console.log(`%cupload row: ${tile.blockRowIndex}, key: ${tile.key}`, 'color: green');

                        payload.dataUploaded = true;
                    }

                    return gpuTexture;
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