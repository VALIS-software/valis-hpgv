export type Contig = {
    id: string // [a-z0-9_\-] lowercase
    name?: string, // display name
    start: number,
    length: number,
}

export default Contig;