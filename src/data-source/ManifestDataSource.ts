import { Contig } from "../model/Contig";
import { IDataSource } from "./IDataSource";
import { GenomeFeature } from "../track/annotation/AnnotationTypes";
import { SequenceTileLoader, AnnotationTileLoader } from "../track";

export type Manifest = {
    contigs: Array<Contig>
}

export class ManifestDataSource implements IDataSource {

    protected manifestPromise: Promise<Manifest>;
    protected pathRoot = '';

    /**
     * @param manifest Manifest object or path to remote manifest
     */
    constructor(readonly manifest: Manifest | (string | undefined)) {
        this.manifestPromise = new Promise((resolve, reject) => {
            // if there's no manifest then return an empty manifest
            if (this.manifest == null) {
                return resolve({
                    contigs: [],
                });
            } else if (typeof manifest === 'string' || (manifest instanceof String)) {
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
                request.open('GET', this.manifest as string);
                request.send();
            } else {
                return resolve(manifest);
            }
        });
    }

    getContigs(): Promise<Array<Contig>> {
        return this.manifestPromise.then((manifest) => manifest.contigs);
    }

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
    }> {
        let path = `${this.pathRoot}/`; // @! need to find path from manifest
        return SequenceTileLoader.loadACGTSequenceFromPath(path, contig, startBaseIndex, span, lodLevel);;
    }

    loadAnnotations(
        contig: string,
        startBaseIndex: number,
        span: number,
        macro: boolean,
    ): Promise<Array<GenomeFeature>> {
        let path = `${this.pathRoot}/`; // @! need to find path from manifest
        return AnnotationTileLoader.loadAnnotations(path, contig, startBaseIndex, span, macro);
    }

}

export default ManifestDataSource;