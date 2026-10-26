// Reproducible, colour-only derivatives; requires the genuine source supplied by the project lead.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function main() {
  const source = process.argv[2] || 'public/textures/source/WAC_GLOBAL_E000N0000_008P.TIF';
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 2880 || metadata.height !== 1440 || metadata.format !== 'tiff') {
    throw new Error('Expected an uncropped 2880×1440 LROC WAC source TIFF. Verify product identity before conversion.');
  }
  const output = 'public/textures';
  await fs.mkdir(output, { recursive: true });
  const derivatives = [];
  for (const [level, width, height] of [['low', 1024, 512], ['medium', 2048, 1024], ['high', 2880, 1440]]) {
    const filename = `moon-${level}.webp`;
    const bytes = await sharp(source).resize(width, height, {fit: 'fill'}).webp({quality: 90}).toBuffer();
    await fs.writeFile(path.join(output, filename), bytes);
    derivatives.push({filename, width, height, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  // Compatibility with the existing frontend path; no false displacement/bump map.
  await sharp(source).png({compressionLevel: 9}).toFile(path.join(output, 'moon-lro.png'));
  const sourceBytes = await fs.readFile(source);
  await fs.writeFile(path.join(output, 'provenance.json'), JSON.stringify({
    sourceProduct: 'WAC_GLOBAL_E000N0000_008P', kind: 'MORPHOLOGY_IMAGERY',
    sourceUrl: 'https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P',
    sourceSha256: crypto.createHash('sha256').update(sourceBytes).digest('hex'),
    sourceIdentity: 'Project-supplied TIFF; identity must be checked against official product metadata.',
    projection: 'SIMPLE_CYLINDRICAL', declaredExtentDegrees: [-180, -90, 180, 90],
    attribution: 'NASA / GSFC / Arizona State University (LROC); verify source product label.',
    scientificUse: 'VISUAL_TEXTURE_ONLY', notFor: ['ELEVATION', 'SLOPE', 'TERRAIN_HORIZON'],
    conversion: {sharp: sharp.versions.sharp, libvips: sharp.versions.vips, webpQuality: 90, crop: false}, derivatives,
  }, null, 2) + '\n');
  console.log('Generated colour textures. Orientation still requires landmark verification against the source map.');
}
main().catch(error => { console.error(`Moon asset conversion blocked: ${error.message}`); process.exitCode = 1; });
