import SiriusApi from "sirius/SiriusApi";
import GPUDevice, { ColorSpaceConversion, GPUTexture, TextureDataType, TextureFormat, TextureMagFilter, TextureMinFilter, TextureWrapMode } from "engine/rendering/GPUDevice";
import TileStore, { Tile } from "./TileStore";

export type TilePayload = {
    array: Uint8Array,
    sequenceMinMax: {
        min: number,
        max: number,
    };
    dataUploaded: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

export type BlockPayload = {
    _gpuTexture: GPUTexture,
    getTexture(device: GPUDevice): GPUTexture;
}

export class SequenceTileStore extends TileStore<TilePayload, BlockPayload> {

    constructor(protected sourceId: string) {
        super(1024, 8);

        SiriusApi.getContigInfo(sourceId).then((info) => {
            this.maximumX = info.length - 1;

            // pre-load the sequence at a high lod level to avoid displaying nothing when zooming out
            let minLength = 512;
            this.getTiles(0, this.maximumX, info.length / minLength, true, () => {});
        }).catch(() => {
            console.warn(`Could not determine sequence length`);
        });
    }

    // skip odd lod levels to trade visual fidelity for improved load time and performance
    protected mapLodLevel(l: number) {
        return Math.floor(l / 2) * 2;
    }

    protected getTilePayload(tile: Tile<TilePayload>) {
        let tileStore = this;
        return SiriusApi.loadACGTSubSequence(this.sourceId, tile.lodLevel, tile.lodX, tile.lodSpan)
            .then((sequenceData) => {
                return {
                    ...sequenceData,
                    dataUploaded: false,
                    getTexture(device: GPUDevice): GPUTexture {
                        let payload: TilePayload = this;

                        let blockPayload = tileStore.getBlockPayload(tile);
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

export default SequenceTileStore;