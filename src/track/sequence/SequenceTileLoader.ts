import GPUDevice, { ColorSpaceConversion, GPUTexture, TextureDataType, TextureFormat, TextureMagFilter, TextureMinFilter, TextureWrapMode } from "engine/rendering/GPUDevice";
import TileLoader, { Tile } from "../TileLoader";
import { SequenceTrackModel } from "./SequenceTrackModel";
import { IDataSource } from "../../data-source/IDataSource";

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
        let tileLoader = this;
        return this.dataSource.loadACGTSequence(this.contig, tile.x, tile.span, tile.lodLevel)
            .then((sequenceData) => {
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
    
}

export default SequenceTileLoader;