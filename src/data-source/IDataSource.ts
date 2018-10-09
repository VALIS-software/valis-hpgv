import { Contig } from "../model/Contig";
import { GenomeFeature } from "../track";

export interface IDataSource {

    getContigs(): Promise<Array<Contig>>;

    loadACGTSequence(
        contig: string,
        startBaseIndex: number,
        span: number,
        lodLevel: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number,
    }>;

    loadAnnotations(
        contig: string,
        startBaseIndex: number,
        span: number,
        macro: boolean,
    ): Promise<Array<GenomeFeature>>;

}

export default IDataSource;