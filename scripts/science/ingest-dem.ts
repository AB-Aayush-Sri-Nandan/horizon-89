import {
  open,
  readFile,
  writeFile,
  mkdir,
  stat,
  rename,
  rm,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, basename, dirname } from "node:path";
import {
  parsePDS3,
  geographicToPixel,
  pixelToGeographic,
  decodeElevation,
  groundSpacing,
  slopeDegrees,
  validateTerrainTile,
  type TerrainTile,
} from "../../src/science/terrain.ts";
const args = process.argv.slice(2);
const inspectOnly = args[0] === "--inspect";
if (inspectOnly) args.shift();
const [labelPath, imagePath, provenancePath, outputPath] = args;
if (
  !labelPath ||
  !imagePath ||
  !provenancePath ||
  (!inspectOnly && !outputPath)
)
  throw new Error(
    "Usage: science:ingest LABEL IMG PROVENANCE_JSON OUTPUT_JSON, or science:inspect LABEL IMG PROVENANCE_JSON",
  );
if (
  (await stat(labelPath)).size > 2_000_000 ||
  (await stat(provenancePath)).size > 100_000
)
  throw new Error(
    "Label/provenance exceeds the supported metadata size budget",
  );
const label = await readFile(labelPath, "utf8"),
  meta = parsePDS3(label);
const pointer = label.match(/^\s*\^IMAGE\s*=\s*"([^"\n]+)"\s*$/m)?.[1];
if (
  !pointer ||
  basename(pointer).toLowerCase() !== basename(imagePath).toLowerCase()
)
  throw new Error(
    "Requires a detached, unoffset ^IMAGE filename matching the selected image. Attached/record-offset products unsupported.",
  );
const bytesPerSample = meta.sampleBits / 8;
if ((await stat(imagePath)).size !== meta.width * meta.height * bytesPerSample)
  throw new Error(
    "Image size does not match metadata; truncated/padded products rejected",
  );
const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
if (!provenance || typeof provenance !== "object" || Array.isArray(provenance))
  throw new Error("Provenance must be a JSON object");
for (const key of ["url", "labelUrl"]) {
  const url = new URL(provenance[key]);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Source URLs must use HTTPS without embedded credentials");
}
if (
  provenance.expectedSha256 !== undefined &&
  provenance.expectedSha256 !== null &&
  !/^[a-f0-9]{64}$/.test(provenance.expectedSha256)
)
  throw new Error(
    "Publisher SHA-256 must be 64 lowercase hexadecimal characters or null",
  );
if (
  typeof provenance.retrievedAt !== "string" ||
  !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(provenance.retrievedAt) ||
  !Number.isFinite(Date.parse(provenance.retrievedAt))
)
  throw new Error(
    "Provenance requires the actual source retrieval date as retrievedAt in UTC; processing time is not retrieval time",
  );
if (provenance.productId !== meta.productId)
  throw new Error("Provenance product ID differs from label");
if (
  !/^https:\/\/(pds-geosciences\.wustl\.edu|imbrium\.mit\.edu|[^/]*\.nasa\.gov|[^/]*\.usgs\.gov)\//.test(
    provenance.url,
  ) ||
  !/^https:\/\//.test(provenance.labelUrl)
)
  throw new Error("Authoritative HTTPS source URL required");
if (
  !provenance.datumDescription ||
  !provenance.license ||
  !provenance.attribution
)
  throw new Error(
    "Reviewed vertical datum, licensing and attribution are required",
  );
async function hash(path: string) {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return h.digest("hex");
}
const imageSha256 = await hash(imagePath),
  labelSha256 = createHash("sha256").update(label).digest("hex");
if (provenance.expectedSha256 && provenance.expectedSha256 !== imageSha256)
  throw new Error("Publisher image SHA-256 mismatch");
if (inspectOnly) {
  console.log(
    JSON.stringify(
      {
        status: "input-checks-passed",
        metadata: meta,
        imageSha256,
        labelSha256,
        integrity: provenance.expectedSha256
          ? "publisher-sha256"
          : "local-sha256-only",
        retrievedAt: provenance.retrievedAt,
        verticalDatum: provenance.datumDescription,
        limitations:
          "Structural input checks only. Independently verify product suitability, licensing and pixel registration before scientific use. No terrain output written.",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const width = 181,
  height = 91,
  bounds = { north: -80, south: -90, west: -180, east: 180 };
const file = await open(imagePath, "r");
const rows = new Map<number, DataView>();
async function pixel(x: number, y: number) {
  if (x < 0 || y < 0 || x >= meta.width || y >= meta.height) return null;
  let row = rows.get(y);
  if (!row) {
    const bytes = new Uint8Array(meta.width * bytesPerSample);
    const result = await file.read(bytes, 0, bytes.length, y * bytes.length);
    if (result.bytesRead !== bytes.length)
      throw new Error("Truncated raster row");
    row = new DataView(bytes.buffer);
    if (rows.size >= 16) rows.delete(rows.keys().next().value!);
    rows.set(y, row);
  }
  return decodeElevation(row, x * bytesPerSample, meta);
}
const elevations: (number | null)[] = [],
  slopes: (number | null)[] = [];
try {
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const latitude =
          bounds.north - (y / (height - 1)) * (bounds.north - bounds.south),
        longitude = bounds.west + (x / (width - 1)) * 360,
        p = geographicToPixel(meta, latitude, longitude);
      if (!p) {
        elevations.push(null);
        slopes.push(null);
        continue;
      }
      const column = Math.max(0, Math.min(meta.width - 1, Math.round(p[0]))),
        row = Math.max(0, Math.min(meta.height - 1, Math.round(p[1]))),
        elevation = await pixel(column, row);
      elevations.push(elevation);
      const spacing = groundSpacing(
        meta,
        pixelToGeographic(meta, column, row)[0],
      );
      slopes.push(
        elevation === null || spacing === null
          ? null
          : slopeDegrees(
              await pixel(column - 1, row),
              await pixel(column + 1, row),
              await pixel(column, row - 1),
              await pixel(column, row + 1),
              spacing,
            ),
      );
    }
} finally {
  await file.close();
}
if (!elevations.some((v) => v !== null))
  throw new Error("DEM has no valid south-polar samples; no output published");
const tile: TerrainTile = {
  version: 1,
  metadata: meta,
  source: {
    url: provenance.url,
    labelUrl: provenance.labelUrl,
    retrievedAt: provenance.retrievedAt,
    processedAt: new Date().toISOString(),
    labelSha256,
    imageSha256,
    integrity: provenance.expectedSha256
      ? "publisher-sha256"
      : "local-sha256-only",
    attribution: provenance.attribution,
    license: provenance.license,
    verticalDatum: provenance.datumDescription,
  },
  bounds,
  width,
  height,
  elevations,
  slopes,
  sampling: "nearest source pixel",
  slopeMethod:
    "Native DEM central differences; polar stereographic local scale corrected; cylindrical slopes unavailable",
};
validateTerrainTile(tile);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
const destination = resolve(outputPath),
  sidecar = destination + ".provenance.json";
if (
  [labelPath, imagePath, provenancePath].some((path) =>
    [destination, sidecar].includes(resolve(path)),
  )
)
  throw new Error("Output must not overwrite an input file");
const partial = destination + `.${process.pid}.partial`,
  sidecarPartial = sidecar + `.${process.pid}.partial`;
try {
  await writeFile(partial, JSON.stringify(tile), { flag: "wx" });
  await writeFile(
    sidecarPartial,
    JSON.stringify(
      {
        originalLabel: label,
        review: provenance,
        metadata: meta,
        hashes: { imageSha256, labelSha256 },
        generatedAt: tile.source.processedAt,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  // Publish the verified tile last; a failed conversion never truncates an existing tile.
  await rename(sidecarPartial, sidecar);
  await rename(partial, destination);
} finally {
  await rm(partial, { force: true });
  await rm(sidecarPartial, { force: true });
}
console.log(
  `Wrote ${width}×${height} sampled grid. No-data preserved as null. Raw imagery was not copied.`,
);
