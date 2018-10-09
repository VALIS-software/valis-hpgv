import { Contig } from "../model/Contig";
import { IDataSource } from "./IDataSource";
import { TileContent } from "../track/annotation/AnnotationTypes";
declare type Manifest = {
    contigs: Array<Contig>;
};
export declare class ManifestDataSource implements IDataSource {
    readonly manifestPath: string;
    protected manifestPromise: Promise<Manifest>;
    constructor(manifestPath: string);
    getContigs(): Promise<Array<Contig>>;
    loadACGTSequence(contig: string, lodLevel: number, startBaseIndex: number, span: number): Promise<{
        array: Uint8Array;
        sequenceMinMax: {
            min: number;
            max: number;
        };
        indicesPerBase: number;
    }>;
    loadAnnotations(contig: string, startBaseIndex: number, span: number, macro: boolean): Promise<TileContent>;
}
export default ManifestDataSource;
