export declare enum GenomicFileFormat {
    BigWig = 0,
    BigBed = 1,
    ValisGenes = 2,
    ValisDna = 3,
    ValisVariants = 4,
    BigBedNarrowPeak = 5,
    BigBedBroadPeak = 6,
    BigBedDataRNAElement = 7,
    BigBedDataMethyl = 8,
    BigBedDataTssPeak = 9,
    BigBedDataIdrPeak = 10,
    BigBedDataIdrRankedPeak = 11
}
export declare class Formats {
    static extensionMap: {
        [key: string]: GenomicFileFormat;
    };
    static ENCODEBigBedMap: {
        [key: string]: GenomicFileFormat;
    };
    static determineFormat(path: string, fileFormatType?: string): GenomicFileFormat | undefined;
}
