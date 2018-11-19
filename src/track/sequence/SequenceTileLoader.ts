import GPUDevice, { ColorSpaceConversion, GPUTexture, TextureDataType, TextureFormat, TextureMagFilter, TextureMinFilter, TextureWrapMode } from "engine/rendering/GPUDevice";
import TileLoader, { Tile } from "../TileLoader";
import { SequenceTrackModel } from "./SequenceTrackModel";
import { IDataSource } from "../../data-source/IDataSource";
import axios, { CancelToken } from 'axios';

type TilePayload = {
    array: Uint8Array,
    sequenceMinMax: {
        min: number,
        max: number,
    };
    dataUploaded: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

type BlockPayload = {
    _gpuTexture: GPUTexture,
    getTexture(device: GPUDevice): GPUTexture;
}

export type SequenceTilePayload = TilePayload;

export class SequenceTileLoader extends TileLoader<TilePayload, BlockPayload> {

    static cacheKey(model: SequenceTrackModel): string { return null; }

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: SequenceTrackModel,
        protected readonly contig: string
    ) {
        super(2048, 32);

        // preload low-resolution data when we know the size of the contig
        dataSource.getContigs().then((contigs) => {
            let contigInfo = contigs.find((c) => c.id === contig);
            if (contigInfo != null) {
                let maxX = contigInfo.span - 1;
                let minSpan = 512;
                this.forEachTile(0, maxX, contigInfo.span / minSpan, true, () => { });
            }
        });
    }

    // skip odd lod levels to trade visual fidelity for improved load time and performance
    mapLodLevel(l: number) {
        return Math.floor(l / 2) * 2;
    }

    protected getTilePayload(tile: Tile<TilePayload>) {
        let sequenceDataPromise: Promise<{
            array: Uint8Array,
            sequenceMinMax: {
                min: number,
                max: number,
            },
            indicesPerBase: number,
        }> = null;

        if (this.model.path != null) {
            // load from path
            sequenceDataPromise = SequenceTileLoader.loadACGTSequenceFromPath(this.model.path, this.contig, tile.x, tile.span, tile.lodLevel);
        } else {
            sequenceDataPromise = this.dataSource.loadACGTSequence(this.contig, tile.x, tile.span, tile.lodLevel);
        }

        const tileLoader = this;
        return sequenceDataPromise.then((sequenceData) => {
                return {
                    ...sequenceData,
                    dataUploaded: false,
                    getTexture(device: GPUDevice): GPUTexture {
                        let payload: TilePayload = this;

                        let blockPayload = tileLoader.getBlockPayload(tile);
                        let gpuTexture: GPUTexture = blockPayload.getTexture(device);

                        // upload this tile's row to the block if not already uploaded
                        if (!payload.dataUploaded) {
                            let nChannels = 4;
                            let dataWidthPixels = payload.array.length / nChannels;

                            // console.log(`%cupload row ${tile.lodLevel}`, 'color: green');

                            gpuTexture.updateTextureData(
                                0,
                                TextureFormat.RGBA,
                                payload.array,
                                0, tile.blockRowIndex, // x, y
                                Math.min(gpuTexture.w, dataWidthPixels), 1, // w, h
                            );

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
            getTexture(device: GPUDevice) {
                let payload: BlockPayload = this;

                // allocate texture if it doesn't already exist
                if (payload._gpuTexture === null) {
                    // console.log(`%ccreate texture ${lodLevel}`, 'color: blue');

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
                        dataType: TextureDataType.UNSIGNED_BYTE,

                        samplingParameters: {
                            magFilter: lodLevel > 0 ? TextureMagFilter.LINEAR : TextureMagFilter.NEAREST,
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

    // static file loading
    private static minMaxCache: {
        [path: string]: Promise<{ min: number, max: number }>
    } = {};

    static loadACGTSequenceFromPath(
        path: string,
        contig: string,

        startBaseIndex: number,
        span: number,
        lodLevel: number,

        // lodLevel: number,
        // lodStartBaseIndex: number,
        // lodSpan: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number,
    }> {
        let binPath = `${path}/${contig}/dna/${lodLevel}.bin`;
        let minMaxPath = binPath + '.minmax';

        let samplingDensity = (1 << lodLevel);
        let lodSpan = span / samplingDensity;
        let lodStartBaseIndex = startBaseIndex / samplingDensity;

        // @! data format may change for certain LODs in the future	
        let elementSize_bits = 8;
        let dataPromise = this.loadArray(binPath, elementSize_bits, lodStartBaseIndex * 4, lodSpan * 4, ArrayFormat.UInt8);
        let minMaxPromise = this.minMaxCache[minMaxPath];

        if (minMaxPromise === undefined) {
            minMaxPromise = axios.get(minMaxPath, { responseType: 'json' }).then((a) => {
                let minMax: { min: number, max: number } = a.data;
                return minMax;
            });
            this.minMaxCache[minMaxPath] = minMaxPromise;
        }

        return Promise.all([dataPromise, minMaxPromise])
            .then((a) => {
                return {
                    array: a[0],
                    sequenceMinMax: a[1],
                    indicesPerBase: 4,
                }
            });
    }

    private static loadArray<T extends keyof ArrayFormatMap>(
        path: string,
        elementSize_bits: number,
        elementIndex: number,
        nElements: number,
        targetFormat: T,
        cancelToken?: CancelToken,
    ): Promise<ArrayFormatMap[T]> {
        let element0_bits = elementIndex * elementSize_bits;
        let byte0 = Math.floor(element0_bits / 8);
        let nBytes = Math.ceil(nElements * elementSize_bits / 8);
        let offset_bits = element0_bits % 8;
        // determine byte range from dataFormat	
        let byteRange = {
            start: byte0,
            end: byte0 + nBytes - 1,
        };
        return axios({
            method: 'get',
            url: path,
            responseType: 'arraybuffer',
            headers: {
                'Range': `bytes=${byteRange.start.toFixed(0)}-${byteRange.end.toFixed(0)}`,
                'Cache-Control': 'no-cache', // @! work around chrome bug	
            },
            cancelToken: cancelToken
        }).then((a) => {
            let unpackingRequired = !((targetFormat === ArrayFormat.UInt8) && (elementSize_bits === 8));
            if (unpackingRequired) {
                let bytes: Uint8Array = new Uint8Array(a.data);
                // allocate output	
                let outputArray: ArrayFormatMap[T];
                switch (targetFormat) {
                    case ArrayFormat.Float32:
                        outputArray = new Float32Array(nElements);
                        break;
                    case ArrayFormat.UInt8:
                        outputArray = new Uint8Array(nElements);
                        break;
                }
                for (let element = 0; element < nElements; element++) {
                    let bitIndex0 = element * elementSize_bits + offset_bits;
                    let bitOffset = bitIndex0 % 8;
                    let byteIndex0 = Math.floor(bitIndex0 / 8);
                    /*	
                    let uint32 = composeUInt32(	
                        bytes[byteIndex0 + 0],	
                        bytes[byteIndex0 + 1],	
                        bytes[byteIndex0 + 2],	
                        bytes[byteIndex0 + 3]	
                    );	
                     outputArray[element] = uint32 & mask32(offset, length) <bit shift>;	
                    */
                }
                throw `Unpacking data not yet supported`;
            } else {
                return new Uint8Array(a.data);
            }
        });
    }
    
}

enum ArrayFormat {
    Float32 = 'f32',
    UInt8 = 'ui8',
}

interface ArrayFormatMap {
    [ArrayFormat.Float32]: Float32Array,
    [ArrayFormat.UInt8]: Uint8Array,
}

export default SequenceTileLoader;