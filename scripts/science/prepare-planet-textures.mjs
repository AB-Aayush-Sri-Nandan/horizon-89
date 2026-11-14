// Reproduce the checked-in visual assets from pinned, hashed NASA-hosted GitHub sources.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const manifest = JSON.parse(
  await readFile("public/textures/planets/provenance.json", "utf8"),
);
for (const asset of manifest.assets) {
  const url = new URL(asset.downloadUrl);
  if (
    url.hostname !== "raw.githubusercontent.com" ||
    !["/nasa/NASA-3D-Resources/", "/NASAWorldWind/WorldWindJava/"].some(
      (prefix) => url.pathname.startsWith(prefix),
    ) ||
    !url.pathname.includes(asset.revision)
  )
    throw new Error("Only pinned NASA sources accepted");
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`NASA asset HTTP ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(source).digest("hex") !== asset.sourceSha256)
    throw new Error(
      `Source checksum mismatch for ${asset.body}; do not change the expected hash to bypass verification`,
    );
  const output = await sharp(source)
    .resize({ width: Math.min(asset.width, 2048), withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  if (createHash("sha256").update(output).digest("hex") !== asset.sha256)
    throw new Error(
      `Conversion differs for ${asset.body}; inspect toolchain before replacing assets`,
    );
  await writeFile("public" + asset.path, output);
  console.log(
    `Verified and reproduced ${asset.body} source map (${asset.width}×${asset.height})`,
  );
}
