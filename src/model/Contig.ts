export type Contig = {
    id: string // [a-z0-9_\-] lowercase
    name?: string, // display name
    startIndex: number,
    span: number,
}

export default Contig;