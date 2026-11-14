import { readFile, writeFile, mkdir, stat, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname, basename } from "node:path";
import sharp from "sharp";
import { inspectGlobalWAC } from "../../src/science/geotiff.ts";
const [input, reviewPath, out = "public/textures/lroc-moon.jpg"] =
  process.argv.slice(2);
if (!input || !reviewPath)
  throw new Error(
    "Usage: science:import-moon INPUT.tif REVIEW.json [OUTPUT.jpg]",
  );
if ((await stat(input)).size > 100_000_000)
  throw new Error("Source exceeds the 100 MB display-import budget");
const raw = await readFile(input),
  metadata = inspectGlobalWAC(raw),
  review = JSON.parse(await readFile(reviewPath, "utf8"));
if (
  review.productId !== metadata.productId ||
  review.sourceUrl !==
    "https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P" ||
  review.target !== "MOON"
)
  throw new Error(
    "Review must identify the exact requested LROC product and Moon",
  );
if (
  [review.datum, review.license, review.attribution].some(
    (value) => typeof value !== "string" || !value.trim(),
  ) ||
  review.registrationChecked !== true ||
  !Number.isFinite(Date.parse(review.retrievedAt)) ||
  !review.retrievedAt.endsWith("Z")
)
  throw new Error(
    "Reviewed datum, license, attribution, retrieval UTC and independent registration check required",
  );
if (
  review.expectedSha256 !== undefined &&
  review.expectedSha256 !== null &&
  !/^[a-f0-9]{64}$/.test(review.expectedSha256)
)
  throw new Error("Invalid publisher SHA-256");
const sourceSha256 = createHash("sha256").update(raw).digest("hex");
if (review.expectedSha256 && review.expectedSha256 !== sourceSha256)
  throw new Error("Publisher checksum mismatch");
const original = await sharp(raw).metadata();
if (
  original.width !== metadata.width ||
  original.height !== metadata.height ||
  (original.pages && original.pages !== 1)
)
  throw new Error("Decoder metadata mismatch or multipage image");
const encoded = await sharp(raw)
  .toColourspace("srgb")
  .jpeg({ quality: 94 })
  .toBuffer();
const path = resolve(out);
if (basename(path) !== "lroc-moon.jpg")
  throw new Error(
    "Output filename must be lroc-moon.jpg so the manifest cannot reference a different asset",
  );
if (
  [input, reviewPath].some((p) =>
    [path, resolve(dirname(path), "lroc-moon.json")].includes(resolve(p)),
  )
)
  throw new Error("Output cannot overwrite source");
await mkdir(dirname(path), { recursive: true });
const temp = path + ".partial";
try {
  await writeFile(temp, encoded, { flag: "wx" });
  await rename(temp, path);
} finally {
  await rm(temp, { force: true });
}
const manifest = {
  state: "available",
  url: "/textures/lroc-moon.jpg",
  source: {
    productId: review.productId,
    sourceUrl: review.sourceUrl,
    target: review.target,
    datum: review.datum,
    license: review.license,
    attribution: review.attribution,
    retrievedAt: review.retrievedAt,
    registrationChecked: true,
    publisherSha256: review.expectedSha256 ?? null,
  },
  metadata,
  sourceSha256,
  sha256: createHash("sha256").update(encoded).digest("hex"),
  processedAt: new Date().toISOString(),
  conversion:
    "Sharp 8-bit TIFF to sRGB JPEG quality 94; no crop, flip, rotation, synthetic craters, elevation or displacement",
};
await writeFile(
  resolve(dirname(path), "lroc-moon.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  "Imported registered 8 px/degree WAC imagery. Not a DEM or close-up terrain product. Rebuild and restart to serve it.",
);
