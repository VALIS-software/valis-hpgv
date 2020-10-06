export enum GenomicFileFormat {
    BigWig,
    BigBed,
    ValisGenes,
    ValisDna,
    ValisVariants,
    BigBedNarrowPeak,
    BigBedBroadPeak,
    BigBedDataRNAElement,
    BigBedDataMethyl,
    BigBedDataTssPeak,
    BigBedDataIdrPeak,
    BigBedDataIdrRankedPeak,
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
        'bedRnaElements': GenomicFileFormat.BigBedDataRNAElement,
        'bedMethyl': GenomicFileFormat.BigBedDataMethyl,
        'tss_peak': GenomicFileFormat.BigBedDataTssPeak,
        'idr_peak': GenomicFileFormat.BigBedDataIdrPeak,
        'idr_ranked_peak,': GenomicFileFormat.BigBedDataIdrRankedPeak,
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
