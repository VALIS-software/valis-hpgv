export enum GenomicFileFormat {
    BigWig,
    BigBed,
    ValisGenes,
    ValisDna,
    ValisVariants,
    BigBedNarrowPeak,
    BigBedBroadPeak,
    BigBedDataMethyl,
    BigBedDataTssPeak,
    BigBedDataIdrPeak,
}

export class Formats {

    static extensionMap: { [key: string]: GenomicFileFormat } = {
        // BigWig
        'bigwig': GenomicFileFormat.BigWig,
        'bwig': GenomicFileFormat.BigWig,
        'bw': GenomicFileFormat.BigWig,

        // BigBEd
        'bigbed': GenomicFileFormat.BigBed,
        'bbed': GenomicFileFormat.BigBed,
        'bb': GenomicFileFormat.BigBed,

        'vgenes-dir': GenomicFileFormat.ValisGenes,
        'vdna-dir': GenomicFileFormat.ValisDna,
        'vvariants-dir': GenomicFileFormat.ValisVariants,
    }

    static ENCODEBigBedMap: { [key: string]: GenomicFileFormat } = {
        'narrowPeak': GenomicFileFormat.BigBedNarrowPeak,
        'broadPeak': GenomicFileFormat.BigBedBroadPeak,
        'bedMethyl': GenomicFileFormat.BigBedDataMethyl,
        'tss_peak': GenomicFileFormat.BigBedDataTssPeak,
        'idr_peak': GenomicFileFormat.BigBedDataIdrPeak,
        'bed': GenomicFileFormat.BigBed,
    }

    static determineFormat(path: string, fileFormatType?: string): GenomicFileFormat | undefined {
        let fileExtension = path.substr(path.lastIndexOf('.') + 1).toLowerCase();

        if (!fileFormatType) {
            return this.extensionMap[fileExtension];
        }

        return this.ENCODEBigBedMap[fileFormatType || 'bed'];
    }
}
