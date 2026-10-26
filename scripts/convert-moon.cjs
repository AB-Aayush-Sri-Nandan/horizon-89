// Lossless colour-only runtime derivative from the checksum-pinned supplied LROC TIFF.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const manifest = JSON.parse(await fs.readFile('assets/lroc-source.json', 'utf8'));
  const source = process.argv[2] || manifest.sourcePath;
  const sourceBytes = await fs.readFile(source);
  if (sourceBytes.length !== manifest.sourceBytes || hash(sourceBytes) !== manifest.sourceSha256) {
    throw new Error('Source size/checksum does not match the reviewed supplied LROC TIFF.');
  }
  const metadata = await sharp(sourceBytes).metadata();
  if (metadata.width !== 2880 || metadata.height !== 1440 || metadata.format !== 'tiff' ||
      metadata.channels !== 1 || metadata.depth !== 'uchar' || metadata.orientation !== 1) {
    throw new Error('Expected the reviewed, north-up 2880×1440 8-bit grayscale LROC TIFF.');
  }
  // Retain all source pixels, full aspect ratio and grayscale; no crop, resize, enhancement or fake height.
  const bytes = await sharp(sourceBytes).toColourspace('b-w').png({compressionLevel: 9}).toBuffer();
  const decoded = await sharp(bytes).toColourspace('b-w').raw().toBuffer();
  if (hash(decoded) !== manifest.sourcePixelSha256) throw new Error('Conversion changed the reviewed source pixel values.');
  const output = 'public/textures';
  await fs.mkdir(output, {recursive: true});
  await fs.writeFile(path.join(output, 'moon-lro.png'), bytes);
  const provenance = {...manifest,
    conversion: {sharp: sharp.versions.sharp, libvips: sharp.versions.vips, outputColourspace: 'b-w',
      compressionLevel: 9, resize: false, crop: false, enhancement: false, pixelValuesPreserved: true},
    runtimeAsset: {filename: 'moon-lro.png', format: 'png', width: 2880, height: 1440,
      channels: 1, bitsPerSample: 8, bytes: bytes.length, sha256: hash(bytes)},
  };
  await fs.writeFile(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  console.log(`Generated moon-lro.png: ${bytes.length} bytes; sha256 ${hash(bytes)}. Visual imagery only.`);
}
main().catch(error => { console.error(`Moon asset conversion blocked: ${error.message}`); process.exitCode = 1; });
