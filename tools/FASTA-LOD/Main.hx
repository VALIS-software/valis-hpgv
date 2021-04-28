/**
	
	- FASTA files are first converted to %a,%c,%g,%t/u format, where each % is stored as a double
	- Next the generated acgt proportions file is downsampled by a factor of 2 recusively until a final value file
	- Finally all the proportion files are converted from doubles into single bytes and the min/max of each file is used to offset scale the data into the range 0 - 1
	- The original proportions can be recovered from the single bytes with
		a' = a * (max - min) + min
		c' = c * (max - min) + min
		g' = g * (max - min) + min
		t' = t * (max - min) + min

	- TODO: Compression
		Level 0, 1 and 2 can be massively compressed by using fewer bits.
			
		- L0 uses 8 * 4 (32) bits per base (995.8 MB)
			- If we want to support _all_ values in FASTA (16) = 4 bits/bp
			- (each bp has 4 values, where each value requires 1 bits)
				=> 8x smaller = 125 MB
			- If we only consider 4 possible values per bp, then we can get x2 smaller but we cannot represent 'N'

		- L1 has 5 values if we only consider FASTA subset (ACGT N):
			[0.0, 0.25, 0.5, 0.75, 1.0]
			- If we exclude 0.75 since it's rare and only exists at N-block boundarys we can use 2 * 4 bits
			=> 497.9 MB => 125 MB

		- L2 adds 4 values to a new total of 9 (the values _between_ each step in L1)
			[0.000, 0.125, 0.250, 0.375, 0.500, 0.625, 0.750, 0.875, 1.000]
			- If we drop one again then this can be represented with 3 * 4 bits

			=> 249 => 93.374999988 MB
			(or 125 MB if we use 4 * 4 bits)

		- L3 adds 8 values to a new total of 15
			- This can be exactly represented by 4 * 4 bits
			=> 125 MB => 62.5 MB

		- L4 adds 14 to a new total of 2
			- Exactly represented by 5 * 4 bits
			=> 62.2 MB => 39 MB

		This keeps the chromosome total somewhere under 700 MB, still individual files must be less than 100 MB
			- Get 1 GB free on firebase


	References:
		https://genestack.com/blog/2016/07/12/choosing-a-reference-genome/
		https://gatkforums.broadinstitute.org/gatk/discussion/11010/human-genome-reference-builds-grch38-hg38-b37-hg19
**/

import haxe.io.*;

#if cpp
typedef UInt64 = cpp.UInt64;
#elseif js
typedef UInt64 = UInt;
#end

class Main {

	static inline var DOUBLE_SIZE = 8;
	static inline var skipExistingFiles = true;

	/**
	static var fastaFilePath = 'data/GCF_000001405.38_GRCh38.p12_genomic.fna';
	static var sequenceNameFilter: Null<EReg> = ~/[\w.]+ Homo sapiens chromosome (1), GRCh38\.p12 Primary Assembly/;

	static function convertFastaSequenceName(name: String) {
		if (sequenceNameFilter != null) {
			sequenceNameFilter.match(name);
			return 'chromosome${sequenceNameFilter.matched(1)}' + '.bin';
		} else {
			return '$name.bin';
		}
	}
	/**/

	/**/
	static var sequenceNameFilter: Null<EReg>;

	static function convertFastaSequenceName(name: String) {
		if (sequenceNameFilter != null) {
			sequenceNameFilter.match(name);
			return 'chr${sequenceNameFilter.matched(1)}' + '.bin';
		} else {
			return '$name.bin';
		}
	}
	/**/

	/**
	// test case
	static var fastaFilePath = 'data/test.fa';
	static var sequenceNameFilter: Null<EReg> = null;
	static function convertFastaSequenceName(name: String) return name + '.double';
	/**/

	static function main() {
		var args = Sys.args();

		if (args.length < 1) {
			Console.error('Pass a fasta path and optional chromosome number as arguments');
			Sys.exit(1);
			return;
		}

		var fastaFilePath = args[0];
		var fastaFilename = Path.withoutExtension(Path.withoutDirectory(fastaFilePath));

		var chromosomeFilter = args[1] != null ? args[1] : '\\w+';
		var filter = '^(${chromosomeFilter}) dna:chromosome chromosome';

		if (args[1] != null) {
			Console.log('Filter is "$filter"');
			sequenceNameFilter = new EReg(filter, '');
		}

		var generatedFilePaths = convertFastaFile(fastaFilePath, Path.join(['_output', fastaFilename + '.vdna-dir']));

		for (path in generatedFilePaths) {
			sys.FileSystem.createDirectory(Path.withoutExtension(path));

			// convert from doubles to bytes
			convertToUByte(path, Path.withoutExtension(path) + '/0.bin');

			// recursively downsample and convert
			var inputPath: String = path;
			var level = 1;
			var lastDoubleLodPath: String = null;
			while(true) {
				var outputPath = Path.withoutExtension(path) + '-lod$level.double';

				if (!downsample(inputPath, outputPath)) break;

				// convert from doubles to bytes
				convertToUByte(outputPath, Path.withoutExtension(path) + '/$level.bin');

				// delete lod double file when we're done with it
				if (lastDoubleLodPath != null) {
					sys.FileSystem.deleteFile(lastDoubleLodPath);
				}

				lastDoubleLodPath = outputPath;
				inputPath = outputPath;
				level++;
			}

			if (lastDoubleLodPath != null) {
				sys.FileSystem.deleteFile(lastDoubleLodPath);
			}
		}

		// remove generated double sequences
		for (path in generatedFilePaths) {
			sys.FileSystem.deleteFile(path);
		}
	}

	// first-pass compression: doubles to bytes + minmax
	static function convertToUByte(path: String, outputPath: String, chunkSize_blocks: UInt64 = Std.int(20e6)) {
		Console.log('<cyan>Converting to byte format "<b>$path</b>"</cyan>');

		var range = minMax(path);
		var delta = range.max - range.min;

		// save range to .minmax file so the origional values can be recovered
		sys.io.File.saveContent(outputPath + '.minmax', haxe.Json.stringify(range));

		var acgtBlockSize = DOUBLE_SIZE * 4;
		var chunkSize_bytes = chunkSize_blocks * acgtBlockSize;

		var input = sys.io.File.read(path, true);
		var length_bytes = sys.FileSystem.stat(path).size;

		var chunksRequired = Math.ceil(length_bytes / chunkSize_bytes);

		var output = sys.io.File.write(outputPath, true);

		for (chunk in 0...chunksRequired) {
			var t0 = haxe.Timer.stamp();

			var bytesRemaining = length_bytes - chunk * chunkSize_bytes;
			var bytesToRead = Std.int(Math.min(bytesRemaining, chunkSize_bytes));
			var inputBytes = input.read(bytesToRead);

			var chunk_blocks = Std.int(inputBytes.length / acgtBlockSize);

			var outputBytes = Bytes.alloc(chunk_blocks * 4);

			for (i in 0...chunk_blocks) {
				var ip = i * acgtBlockSize;

				var a = inputBytes.getDouble(ip + 0 * DOUBLE_SIZE);
				var c = inputBytes.getDouble(ip + 1 * DOUBLE_SIZE);
				var g = inputBytes.getDouble(ip + 2 * DOUBLE_SIZE);
				var t = inputBytes.getDouble(ip + 3 * DOUBLE_SIZE);

				var scaleFactor = delta == 0 ? 0 : 1 / delta;

				var op = i * 4;

				outputBytes.set(op + 0, Math.round(Math.min((a - range.min) * scaleFactor, 1.) * 0xFF));
				outputBytes.set(op + 1, Math.round(Math.min((c - range.min) * scaleFactor, 1.) * 0xFF));
				outputBytes.set(op + 2, Math.round(Math.min((g - range.min) * scaleFactor, 1.) * 0xFF));
				outputBytes.set(op + 3, Math.round(Math.min((t - range.min) * scaleFactor, 1.) * 0xFF));
			}

			output.write(outputBytes);

			#if cpp cpp.NativeGc.run(true); #end

			var dt = haxe.Timer.stamp() - t0;
			var progress = (chunk + 1)/chunksRequired;
			Console.log('<b>${Math.round(progress * 100)}%</b> (${Math.round(((bytesToRead / 1e6) / dt) * 100)/100} MB/s)');
		}

		input.close();
		output.close();

		Console.success('<light_green>Saved "<b>$outputPath</b>"<//>');
	}

	static function minMax(path: String, chunkSize_blocks: UInt64 = Std.int(20e6)) {
		Console.log('<cyan>Computing min/max of "<b>$path</b>"</cyan>');

		var acgtBlockSize = DOUBLE_SIZE * 4;
		var chunkSize_bytes = chunkSize_blocks * acgtBlockSize;

		var input = sys.io.File.read(path, true);
		var length_bytes = sys.FileSystem.stat(path).size;

		var chunksRequired = Math.ceil(length_bytes / chunkSize_bytes);

		var max = Math.NEGATIVE_INFINITY;
		var min = Math.POSITIVE_INFINITY;

		for (chunk in 0...chunksRequired) {
			var t0 = haxe.Timer.stamp();

			var bytesRemaining = length_bytes - chunk * chunkSize_bytes;
			var bytesToRead = Std.int(Math.min(bytesRemaining, chunkSize_bytes));
			var inputBytes = input.read(bytesToRead);

			var chunk_blocks = Std.int(inputBytes.length / acgtBlockSize);

			for (i in 0...chunk_blocks) {
				var ip = i * acgtBlockSize;

				var a = inputBytes.getDouble(ip + 0 * DOUBLE_SIZE);
				var c = inputBytes.getDouble(ip + 1 * DOUBLE_SIZE);
				var g = inputBytes.getDouble(ip + 2 * DOUBLE_SIZE);
				var t = inputBytes.getDouble(ip + 3 * DOUBLE_SIZE);

				var localMax = Math.max(Math.max(a, c), Math.max(g, t));
				var localMin = Math.min(Math.min(a, c), Math.min(g, t));

				max = Math.max(localMax, max);
				min = Math.min(localMin, min);
			}

			#if cpp cpp.NativeGc.run(true); #end

			var dt = haxe.Timer.stamp() - t0;
			var progress = (chunk + 1)/chunksRequired;
			Console.log('<b>${Math.round(progress * 100)}%</b> (${Math.round(((bytesToRead / 1e6) / dt) * 100)/100} MB/s)');
		}

		input.close();

		Console.success('min: $min, max: $max');

		return {
			min: min,
			max: max,
		}
	}

	// debug utility method
	static function printBlocks(path: String, count: Int, offset: Int = 0) {
		var acgtBlockSize = DOUBLE_SIZE * 4;

		Console.log(path);

		var input = sys.io.File.read(path, true);
		var length_bytes = sys.FileSystem.stat(path).size;
		var length_blocks = length_bytes / acgtBlockSize;

		var offsetBytes = offset * acgtBlockSize;
		if (offsetBytes > 0) {
			input.seek(offsetBytes, SeekBegin);
		}

		var blocksAvailable = length_blocks - offset; 
		var blocksToRead = Std.int(Math.min(count, blocksAvailable));
		var bytesToRead = acgtBlockSize * blocksToRead;
		
		var bytes = input.read(bytesToRead);

		for (i in 0...blocksToRead) {
			var p = i * acgtBlockSize;
			var a = bytes.getDouble(p + 0 * DOUBLE_SIZE);
			var c = bytes.getDouble(p + 1 * DOUBLE_SIZE);
			var g = bytes.getDouble(p + 2 * DOUBLE_SIZE);
			var t = bytes.getDouble(p + 3 * DOUBLE_SIZE);

			Sys.print('$a\t$c\t$g\t$t\n');
		}

		input.close();

		return;
	}

	static function downsample(path: String, outputPath: String, chunkSize_blocks: UInt64 = Std.int(20e6)) {
		if (chunkSize_blocks % 2 != 0) {
			throw 'chunkSize_blocks must be multiple of 2';
		}

		var acgtBlockSize = DOUBLE_SIZE * 4;
		var chunkSize_bytes = chunkSize_blocks * acgtBlockSize;

		Console.log('<cyan>Downsampling "<b>$path</b>"</cyan>');

		var input = sys.io.File.read(path, false);
		var length_bytes = sys.FileSystem.stat(path).size;

		#if cpp
		var length_blocks: UInt64 = untyped __cpp__('{0}/{1}', length_bytes, acgtBlockSize);
		#else
		var length_blocks: UInt64 = Std.int(length_bytes / acgtBlockSize);
		#end

		var chunksRequired = Math.ceil(length_bytes / chunkSize_bytes);

		// cannot down sample length 1
		if (length_blocks <= 1) {
			input.close();
			return false;
		}

		var output_blocks: UInt64 = Math.ceil(length_blocks / 2);
		var output_bytes: UInt64 = output_blocks * acgtBlockSize;

		Console.log('\tacgtBlockSize: $acgtBlockSize');
		Console.log('\tchunkSize_bytes: $chunkSize_bytes');
		Console.log('\tchunksRequired: $chunksRequired');
		Console.log('\tlength_bytes: $length_bytes');
		Console.log('\tlength_blocks: $length_blocks');

		Console.log('\toutput_blocks: $output_blocks');
		Console.log('\toutput_bytes: $output_bytes');

		var output = sys.io.File.write(outputPath, true);
		Console.log('Created "<b>$outputPath</b>"');

		for (chunk in 0...chunksRequired) {
			var t0 = haxe.Timer.stamp();

			var bytesRemaining = length_bytes - chunk * chunkSize_bytes;
			var bytesToRead = Std.int(Math.min(bytesRemaining, chunkSize_bytes));
			var inputBytes = input.read(bytesToRead);

			#if cpp
			var chunk_blocks: UInt64 = untyped __cpp__('{0}/{1}', inputBytes.length, acgtBlockSize);
			#else
			var chunk_blocks: UInt64 = Std.int(inputBytes.length / acgtBlockSize);
			#end

			var downsample_blocks: UInt64 = Math.ceil(chunk_blocks / 2);
			var downsampleBytes = Bytes.alloc(downsample_blocks * acgtBlockSize);

			for (block in 0...downsample_blocks) {
				var leftBlock: UInt64 = block * 2;
				var rightBlock: UInt64 = leftBlock + 1;

				if (rightBlock > (chunk_blocks - 1)) {
					rightBlock = chunk_blocks - 1;
					if (chunk != chunksRequired - 1) {
						Console.error('Right sample overflowed chunk unexpectedly');
					}
				}

				var ipl: UInt64 = leftBlock * acgtBlockSize;
				var ipr: UInt64 = rightBlock * acgtBlockSize;

				var al = inputBytes.getDouble(ipl + 0 * DOUBLE_SIZE);
				var cl = inputBytes.getDouble(ipl + 1 * DOUBLE_SIZE);
				var gl = inputBytes.getDouble(ipl + 2 * DOUBLE_SIZE);
				var tl = inputBytes.getDouble(ipl + 3 * DOUBLE_SIZE);

				var ar = inputBytes.getDouble(ipr + 0 * DOUBLE_SIZE);
				var cr = inputBytes.getDouble(ipr + 1 * DOUBLE_SIZE);
				var gr = inputBytes.getDouble(ipr + 2 * DOUBLE_SIZE);
				var tr = inputBytes.getDouble(ipr + 3 * DOUBLE_SIZE);

				var op = block * acgtBlockSize;

				downsampleBytes.setDouble(op + 0 * DOUBLE_SIZE, (al + ar) * 0.5);
				downsampleBytes.setDouble(op + 1 * DOUBLE_SIZE, (cl + cr) * 0.5);
				downsampleBytes.setDouble(op + 2 * DOUBLE_SIZE, (gl + gr) * 0.5);
				downsampleBytes.setDouble(op + 3 * DOUBLE_SIZE, (tl + tr) * 0.5);
			}

			output.write(downsampleBytes);

			#if cpp cpp.NativeGc.run(true); #end

			var dt = haxe.Timer.stamp() - t0;
			var progress = (chunk + 1)/chunksRequired;
			Console.log('<b>${Math.round(progress * 100)}%</b> (${Math.round(((bytesToRead / 1e6) / dt) * 100)/100} MB/s)');
		}

		input.close();
		output.close();
		return true;
	}
	

	static function convertFastaFile(
		path: String,
		outputDirectory: String,
		chunkSize_bytes: Int = Std.int(10e6) /* be careful, it's very easy to exceed max int if this is too large */
	) {
		Console.log('<cyan>Reading "<b>$path</b>"</cyan>');

		var currentOutputBuffer: haxe.io.Output = null;
		var generatedFilePaths = new Array<String>();
		var skipSequence = false;
		var returnSequence = true;

		function onFastaSequenceStart(name: String) {
			skipSequence = false;
			returnSequence = true;

			if (sequenceNameFilter != null) {
				if (!sequenceNameFilter.match(name)) {
					Console.warn('Skipping "<b>$name</b>" because it was not included in filter');
					skipSequence = true;
					returnSequence = false;
					return;
				}
			}

			Console.log('Started sequence "<b>$name</b>"');

			var filename = convertFastaSequenceName(name);

			// touch output directory
			sys.FileSystem.createDirectory(outputDirectory);

			var path = Path.join([outputDirectory, filename]);

			if (returnSequence) {
				generatedFilePaths.push(path);
			}

			if (sys.FileSystem.exists(path) && skipExistingFiles) {
				Console.warn('Skipping "<b>$path</b>" because file already exists');
				skipSequence = true;
				return;
			}

			if (currentOutputBuffer != null) {
				currentOutputBuffer.close();
			}

			currentOutputBuffer = sys.io.File.write(path, true);
		}

		function onFastaSequenceChunk(sequenceChunk: BytesInput) {
			if (skipSequence) {
				return;
			}

			var acgtBlockSize = DOUBLE_SIZE * 4;

			// buffer may not be completely filled with values since sequenceChunk may contain skipped newline characters
			var buffer = Bytes.alloc(sequenceChunk.length * acgtBlockSize);
			var bufferBlockPos = 0;

			// maybe this helps?
			currentOutputBuffer.prepare(buffer.length);

			inline function w(a: Float, c: Float, g: Float, tu: Float) {
				var pos = bufferBlockPos * acgtBlockSize;

				buffer.setDouble(pos + 0 * DOUBLE_SIZE, a);
				buffer.setDouble(pos + 1 * DOUBLE_SIZE, c);
				buffer.setDouble(pos + 2 * DOUBLE_SIZE, g);
				buffer.setDouble(pos + 3 * DOUBLE_SIZE, tu);

				bufferBlockPos++;
			}

			var unknownMap = new Map<String, Int>();
			var hasUnknownCharacters = false;

			for (i in 0...sequenceChunk.length) {
				var charCode = sequenceChunk.readByte();

				switch charCode {
					case 'A'.code, 'a'.code: w(  1,   0,   0,   0); 
					case 'C'.code, 'c'.code: w(  0,   1,   0,   0); 
					case 'G'.code, 'g'.code: w(  0,   0,   1,   0); 
					case 'T'.code, 't'.code: w(  0,   0,   0,   1); 
					case 'U'.code, 'u'.code: w(  0,   0,   0,   1); 
					case 'R'.code, 'r'.code: w(1/2,   0, 1/2,   0); 
					case 'Y'.code, 'y'.code: w(  0, 1/2,   0, 1/2); 
					case 'K'.code, 'k'.code: w(  0,   0, 1/2, 1/2); 
					case 'M'.code, 'm'.code: w(1/2, 1/2,   0,   0); 
					case 'S'.code, 's'.code: w(  0, 1/2, 1/2,   0); 
					case 'W'.code, 'w'.code: w(1/2,   0,   0, 1/2); 
					case 'B'.code, 'b'.code: w(  0, 1/3, 1/3, 1/3); 
					case 'D'.code, 'd'.code: w(1/3,   0, 1/3, 1/3); 
					case 'H'.code, 'h'.code: w(1/3, 1/3,   0, 1/3); 
					case 'V'.code, 'v'.code: w(1/3, 1/3, 1/3,   0); 
					case 'N'.code, 'n'.code: w(1/4, 1/4, 1/4, 1/4); 
					case '-'.code: w(  0,   0,   0,   0); 
					case '\n'.code: // ignore

					default:
						hasUnknownCharacters = true;

						var char = String.fromCharCode(charCode);
						var count = unknownMap.get(char);
						if (count == null) count = 0;
						unknownMap.set(char, count + 1);

						w(0, 0, 0, 0);
				}
			}

			sequenceChunk.close();

			currentOutputBuffer.writeFullBytes(buffer, 0, bufferBlockPos * acgtBlockSize);

			if (hasUnknownCharacters) {
				Console.error('Unknown characters', unknownMap);
			}
		}

		var fastaParser = new FastaParser(
			onFastaSequenceStart,
			onFastaSequenceChunk
		);

		var input = sys.io.File.read(path, false);
		var length_bytes = sys.FileSystem.stat(path).size;
		var chunksRequired = Math.ceil(length_bytes / chunkSize_bytes);

		Console.log('$chunksRequired chunks required');

		var tStart = haxe.Timer.stamp();

		for (chunk in 0...chunksRequired) {
			var t0 = haxe.Timer.stamp();

			var bytesRemaining = length_bytes - chunk * chunkSize_bytes;
			var bytesToRead = Std.int(Math.min(bytesRemaining, chunkSize_bytes));

			fastaParser.processChunk(input.read(bytesToRead));

			#if cpp cpp.NativeGc.run(true); #end

			var dt = haxe.Timer.stamp() - t0;
			var progress = (chunk + 1)/chunksRequired;
			Console.log('<b>${Math.round(progress * 100)}%</b> (${Math.round(((bytesToRead / 1e6) / dt) * 100)/100} MB/s)');
		}

		input.close();
		fastaParser.done();

		var dt = (haxe.Timer.stamp() - tStart);
		Console.log('Converting FASTA file took ${Math.round(dt * 10)/10}s (${Math.round(((length_bytes / 1e6) / dt) *100)/100} MB/s)');

		if (currentOutputBuffer != null) {
			currentOutputBuffer.close();
		}

		return generatedFilePaths;
	}

}

@:enum abstract ParseMode(Int) {
	var Unset = 0;
	var Header = 1;
	var Sequence = 2;
}

class FastaParser {

	var parseMode: ParseMode = Unset;
	var headerBuffer: String = '';

	var onSequenceStarted: (name: String) -> Void;
	var onSequenceChunk: (sequenceChunk: BytesInput) -> Void;

	public function new(onSequenceStarted: (name: String) -> Void, onSequenceChunk: (sequenceChunk: BytesInput) -> Void) {
		this.onSequenceStarted = onSequenceStarted;
		this.onSequenceChunk = onSequenceChunk;
	}

	public function processChunk(bytes: Bytes) {

		var sequenceStart: Int = 0;

		for (i in 0...bytes.length) {

			var byte = bytes.get(i);

			switch parseMode {
				case Sequence, Unset: {

					switch byte {
						case '>'.code: // sequence end / header started

							// flush the current sequence chunk
							if (parseMode == Sequence) {
								var sequenceLength = i - sequenceStart;
								onSequenceChunk(new haxe.io.BytesInput(bytes, sequenceStart, sequenceLength));
							}

							headerBuffer = '';
							parseMode = Header;

						default: // a sequence character
					}

				}

				case Header: {

					switch byte {

						case '\n'.code: // header finished
							onSequenceStarted(headerBuffer);
							parseMode = Sequence;
							sequenceStart = i + 1;

						default: // header character
							headerBuffer += String.fromCharCode(byte);

					}

				}
			}

		}

		// after we've iterated the chunk, if we were in the middle of a sequence we should finish up the sequence chunk
		if (parseMode == Sequence) {
			onSequenceChunk(new haxe.io.BytesInput(bytes, sequenceStart));
		}
	}

	public function done() {
	}

}