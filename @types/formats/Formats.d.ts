export declare enum GenomicFileFormat {
    BigWig = 0,
    BigBed = 1,
    ValisGenes = 2,
    ValisDna = 3,
    ValisVariants = 4
}
export declare class Formats {
    static extensionMap: {
        [key: string]: GenomicFileFormat;
    };
    static determineFormat(path: string): GenomicFileFormat | undefined;
}
