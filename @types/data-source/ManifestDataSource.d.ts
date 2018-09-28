import { DataSource } from "../model/DataSource";
export declare class ManifestDataSource implements DataSource {
    readonly manifestPath: string;
    constructor(manifestPath: string);
}
export default ManifestDataSource;
