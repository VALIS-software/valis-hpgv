/*

Some sort of lod block abstraction

with an input abstraction (could be fasta file or raw buffer) and an output extraction to write the computed lod fragments

we say, compute this many bytes of lod tree given this input pipe

when the input is fully exhausted, we've saved the bottom x lod levels into files including 0?

we then repeat the process using the top computed lod as the input (probably reading from disk?) and not writing the bottom level this time
	* it would be better if this level was not written to disk in the first place but in ram
		- but it makes a kind of implementation asymmetry where we have to make sure we write that last layer to disk at the end

With the input abstraction, we're only reading a single layer but we've got to be conscious of the limitations imposed by FASTA
	- We don't know the buffer length ahead of time (this limits the size of the tree!)
	- The buffer is chunked
	- Should the lod fragment know to stop and tie up when the read buffer is exhausted?

	- It's not guaranteed that the lod levels get written at all, if the bottom layer is exhaused

How should downsampling NPOT work?
div 2 with ceil or floor

the actual downsampling process could probably be carried out ont the GPU if that would be faster

*/

/*
interface LodFragmentInput {

	read();

}

interface LodFragmentOutput {

	write(level: number, values: Array<number>): Promise<void>;

}

interface LodFragment {

	constructor(output: LodFragmentOutput);
	add(values: Array<number>);
	complete()

}
*/

function fastaConvert(inputFilePath: string, outputDirectory: string) {
	
}

enum ParseMode {
	Unset,
	Sequence,
	Header,
}

/*
class FastaParser {

	protected parseMode: ParseMode = ParseMode.Unset;
	protected headerBuffer: String = '';

	protected onSequenceStarted: (name: String) => void;
	protected onSequenceChunk: (sequenceChunk: BytesInput) => void;

	constructor(onSequenceStarted: (name: String) => void, onSequenceChunk: (sequenceChunk: BytesInput) => void) {
		this.onSequenceStarted = onSequenceStarted;
		this.onSequenceChunk = onSequenceChunk;
	}

	processChunk(bytes: Bytes) {

		let sequenceStart = 0;

		const headerStartCode = '>'.charCodeAt(0);
		const newlineCode = '\n'.charCodeAt(0);

		for (let i = 0; i < bytes.length; i++) {

			let byte = bytes.get(i);

			switch (this.parseMode) {
				case ParseMode.Sequence:
				case ParseMode.Unset: {

					if (byte === headerStartCode) {
						// flush the current sequence chunk
						if (this.parseMode == ParseMode.Sequence) {
							let sequenceLength = i - sequenceStart;
							this.onSequenceChunk(new haxe.io.BytesInput(bytes, sequenceStart, sequenceLength));
						}

						this.headerBuffer = '';
						this.parseMode = ParseMode.Header;
					}

					break;
				}

				case ParseMode.Header: {

					if (byte === newlineCode) {
						// header finished
						this.onSequenceStarted(this.headerBuffer);
						this.parseMode = ParseMode.Sequence;
						sequenceStart = i + 1;
					} else {
						// header character
						this.headerBuffer += String.fromCharCode(byte);
					}

					break;
				}
			}

		}

		// after we've iterated the chunk, if we were in the middle of a sequence we should finish up the sequence chunk
		if (this.parseMode == ParseMode.Sequence) {
			this.onSequenceChunk(new haxe.io.BytesInput(bytes, sequenceStart));
		}
	} 

}
*/