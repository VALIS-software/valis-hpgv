import { Contig } from "../model/Contig";
import { IDataSource } from "./IDataSource";
import { TileContent } from "../track/annotation/AnnotationTypes";

type Manifest = {
    contigs: Array<Contig>
}

export class ManifestDataSource implements IDataSource {

    protected manifestPromise: Promise<Manifest>;

    constructor(readonly manifestPath: string) {
        this.manifestPromise = new Promise((resolve, reject) => {
            let request = new XMLHttpRequest();
            request.addEventListener('loadend', (e) => {
                // assume success if in 2xx range
                if (request.status >= 200 && request.status < 300) {
                    try {
                        let manifest = JSON.parse(request.responseText);
                        resolve(manifest);
                    } catch (e) {
                        reject(`Error parsing manifest: ${e}`)
                    }
                } else {
                    reject(`Could not load manifest: (${request.status}) ${request.statusText}`);
                }
            });
            request.open('GET', this.manifestPath);
            request.send();
        });
    }

    getContigs(): Promise<Array<Contig>> {
        return this.manifestPromise.then((manifest) => manifest.contigs);
    }

    loadACGTSequence(
        contig: string,
        lodLevel: number,
        startBaseIndex: number,
        span: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number,
    }> {
        console.error(`@! TODO: support loadACGTSequence`);
        return null;
    }

    loadAnnotations(
        contig: string,
        startBaseIndex: number,
        span: number,
        macro: boolean,
    ): Promise<TileContent> {
        console.error(`@! TODO: support loadAnnotations`);
        return null;
    }

}

export default ManifestDataSource;