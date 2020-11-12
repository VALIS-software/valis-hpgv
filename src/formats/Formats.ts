import { extname } from "path";

export enum GenomicFileFormat {
    BigWig,
    BigBed,
    ValisGenes,
    ValisDna,
    ValisVariants,
    BigBedNarrowPeak,
    BigBedBroadPeak,
    BigBedDataTssPeak,
    BigBedDataIdrPeak,
    BigBedData3Plus,
    BigBedData6Plus,
    BigBedData9Plus,
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
        'tss_peak': GenomicFileFormat.BigBedDataTssPeak,
        'idr_peak': GenomicFileFormat.BigBedDataIdrPeak,
        'bed3+': GenomicFileFormat.BigBedData3Plus,
        'bed6+': GenomicFileFormat.BigBedData6Plus,
        'bed9+': GenomicFileFormat.BigBedData9Plus,
        'bed': GenomicFileFormat.BigBed,
    }

    static determineFormat(path: string, fileFormatType?: string): GenomicFileFormat | undefined {
        let fileExtension = path.substr(path.lastIndexOf('.') + 1).toLowerCase();

        if (['bigbed', 'bbed', 'bb'].indexOf(fileExtension) !== -1) {
            return this.ENCODEBigBedMap[fileFormatType || 'bed'];
        }

        return this.extensionMap[fileExtension];   
    }
}
