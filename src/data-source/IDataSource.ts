import { Contig } from "../model/Contig";

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

}

export default IDataSource;