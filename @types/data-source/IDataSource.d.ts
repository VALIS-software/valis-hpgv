import { Contig } from "../model/Contig";
export interface IDataSource {
    getContigs(): Promise<Array<Contig>>;
}
export default IDataSource;
