import { Contig } from "../model/Contig";
import { IDataSource } from "./IDataSource";
import { GenomeFeature } from "../track/annotation/AnnotationTypes";
export declare type Manifest = {
    contigs: Array<Contig>;
};
export declare class ManifestDataSource implements IDataSource {
    readonly manifest: Manifest | (string | undefined);
    protected manifestPromise: Promise<Manifest>;
    /**
     * @param manifest Manifest object or path to remote manifest
     */
    constructor(manifest: Manifest | (string | undefined));
    getContigs(): Promise<Array<Contig>>;
    loadACGTSequence(contig: string, lodLevel: number, startBaseIndex: number, span: number): Promise<{
        array: Uint8Array;
        sequenceMinMax: {
            min: number;
            max: number;
        };
        indicesPerBase: number;
    }>;
    loadAnnotations(contig: string, startBaseIndex: number, span: number, macro: boolean): Promise<Array<GenomeFeature>>;
}
export default ManifestDataSource;
