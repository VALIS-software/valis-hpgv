import { BigWigReader, HeaderData } from "genomic-reader";
import { Tile } from "../track";
export declare type BigLoader = {
    header: HeaderData;
    reader: BigWigReader;
    lodMap: Array<number>;
    lodZoomIndexMap: Array<number | null>;
};
export declare class UCSCBig {
    /**
     * Generate a BigWig loader instance for a given BigWig file path
     */
    private static _requestIndex;
    static getBigLoader(path: string, forceAvoidCaching?: boolean): Promise<BigLoader>;
    /**
     * Given a BigWig loader instance, load BigWig data to cover *tile* into texture ArrayBuffer *buffer*.
     * Copies values into *targetChannel* assuming *nChannels* texture channels.
     */
    static getBigWigDataForTile(bigWigLoader: BigLoader, contig: string, tile: Tile<any>, buffer: Float32Array, nChannels: number, targetChannel: number): Promise<Float32Array>;
    static getContigs(header: HeaderData): {
        id: string;
        startIndex: number;
        span: number;
    }[];
    /**
     * Convert a BigWig zoom levels header into maps so we can lookup the zoom level for any given lod
     */
    protected static generateLodLookups(bigWigHeader: HeaderData): {
        lodMap: Array<number>;
        lodZoomIndexMap: Array<number>;
    };
}
