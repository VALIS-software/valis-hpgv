import sys.io.File;
import haxe.Json;
import haxe.io.Path;
import sys.FileSystem;

typedef Contig = {
    id: String, // [a-z0-9_\-] lowercase
    ?name: String, // display name
    startIndex: Int,
    span: Int,
}

typedef Manifest = {
    contigs: Array<Contig>
}

class ManifestGenerator {

    static public function main() {
        var vdnaDir = '_output';
        for (name in FileSystem.readDirectory(vdnaDir)) {
            if (Path.extension(name).toLowerCase() != '.vdna-dir') continue;
            var filePath = Path.join([vdnaDir, name]);
            var manifest = generateManifestForPath(filePath);
            var manifestPath = Path.join([filePath, 'manifest.json']);
            sys.io.File.saveContent(manifestPath, Json.stringify(manifest));
        }
    }

    static function generateManifestForPath(path: String): Manifest {
        // find all contigs
        var contigs = new Array<Contig>();

        for (name in FileSystem.readDirectory(path)) {
            var filePath = Path.join([path, name]);

            var lod0Path = Path.join([filePath, '0.bin']);

            if (FileSystem.isDirectory(filePath) && FileSystem.exists(lod0Path) && !FileSystem.isDirectory(lod0Path)) {
                // get size of $filePath/0.bin

                var lod0Size = FileSystem.stat(lod0Path).size;
                if (lod0Size % 4 != 0) {
                    trace('0.bin had a unexpected length (should be a multiple of 4)');
                }

                // assuming lod0 is 4 bytes per base
                var nBases = Std.int(lod0Size / 4);

                contigs.push({
                    id: name,
                    startIndex: 0,
                    span: nBases,
                });
            }             
        }

        return {
            contigs: contigs,
        }
    }

}