// Reproduce the local NASA display image without changing expected checksums.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const record = JSON.parse(
  await readFile("public/images/space-provenance.json", "utf8"),
);
const url = record.sourceUrl
  .replace("https://github.com/", "https://raw.githubusercontent.com/")
  .replace("/blob/", "/");
if (
  !url.startsWith(
    `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/${record.revision}/`,
  )
)
  throw new Error("Expected pinned NASA source");
const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
if (!response.ok) throw new Error(`NASA image HTTP ${response.status}`);
const source = Buffer.from(await response.arrayBuffer());
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (hash(source) !== record.sourceSha256)
  throw new Error("Source checksum mismatch");
const display = await sharp(source)
  .resize({ width: 2560, withoutEnlargement: true })
  .jpeg({ quality: 88 })
  .toBuffer();
if (hash(display) !== record.sha256)
  throw new Error("Display checksum mismatch; inspect conversion toolchain");
await writeFile("public" + record.path, display);
console.log(
  "Verified NASA Tycho source and reproduced the local display image.",
);
