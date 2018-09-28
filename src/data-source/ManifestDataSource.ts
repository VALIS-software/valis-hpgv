import { DataSource } from "../model/DataSource";

export class ManifestDataSource implements DataSource {

    constructor(readonly manifestPath: string) {

    }

}

export default ManifestDataSource;