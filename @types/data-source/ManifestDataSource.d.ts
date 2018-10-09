import { Contig } from "../model/Contig";
import { IDataSource } from "./IDataSource";
declare type Manifest = {
    contigs: Array<Contig>;
};
export declare class ManifestDataSource implements IDataSource {
    readonly manifestPath: string;
    protected manifestPromise: Promise<Manifest>;
    constructor(manifestPath: string);
    getContigs(): Promise<Array<Contig>>;
}
export default ManifestDataSource;
