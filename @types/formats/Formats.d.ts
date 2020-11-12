export declare enum GenomicFileFormat {
    BigWig = 0,
    BigBed = 1,
    ValisGenes = 2,
    ValisDna = 3,
    ValisVariants = 4,
    BigBedNarrowPeak = 5,
    BigBedBroadPeak = 6,
    BigBedDataTssPeak = 7,
    BigBedDataIdrPeak = 8,
    BigBedData3Plus = 9,
    BigBedData6Plus = 10,
    BigBedData9Plus = 11
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
