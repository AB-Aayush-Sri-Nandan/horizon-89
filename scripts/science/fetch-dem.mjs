import { createWriteStream } from "node:fs";
import { mkdir, link, rm, writeFile } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { resolve, basename } from "node:path";
const [labelUrl, imageUrl, directory, expectedSha256] = process.argv.slice(2);
if (!directory)
  throw new Error(
    "Usage: NODE_USE_ENV_PROXY=1 node scripts/science/fetch-dem.mjs LABEL_URL IMAGE_URL RAW_DIRECTORY [PUBLISHER_IMAGE_SHA256]",
  );
function authoritative(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    (!["pds-geosciences.wustl.edu", "imbrium.mit.edu"].includes(u.hostname) &&
      !u.hostname.endsWith(".nasa.gov") &&
      !u.hostname.endsWith(".usgs.gov"))
  )
    throw new Error("Authoritative HTTPS host required");
  return u;
}
if (expectedSha256 && !/^[a-f0-9]{64}$/.test(expectedSha256))
  throw new Error(
    "Expected SHA-256 must be 64 lowercase hexadecimal characters",
  );
await mkdir(directory, { recursive: true });
const records = [];
for (const [kind, value, limit] of [
  ["label", labelUrl, 2e6],
  ["image", imageUrl, 2e9],
]) {
  const url = authoritative(value);
  const destination = resolve(directory, basename(url.pathname));
  const partial = destination + ".partial";
  let size = 0;
  const hash = createHash("sha256");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body)
      throw new Error(
        `Authoritative retrieval failed: HTTP ${response.status}`,
      );
    authoritative(response.url);
    if (response.headers.get("content-type")?.includes("text/html"))
      throw new Error("HTML is not a DEM product");
    await pipeline(
      Readable.fromWeb(response.body),
      new Transform({
        transform(chunk, _, callback) {
          size += chunk.length;
          if (size > limit)
            return callback(new Error("Product exceeds download size budget"));
          hash.update(chunk);
          callback(null, chunk);
        },
      }),
      createWriteStream(partial, { flags: "wx" }),
    );
    const sha256 = hash.digest("hex");
    if (kind === "image" && expectedSha256 && sha256 !== expectedSha256)
      throw new Error("Publisher checksum mismatch");
    // Never overwrite a previously downloaded local product.
    await link(partial, destination);
    await rm(partial);
    records.push({
      kind,
      url: response.url,
      path: destination,
      bytes: size,
      sha256,
      publisherVerified: kind === "image" && Boolean(expectedSha256),
    });
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}
await writeFile(
  resolve(directory, "retrieval.json"),
  JSON.stringify({ retrievedAt: new Date().toISOString(), records }, null, 2),
);
console.log(
  "Retrieved products with TLS verification. Check retrieval.json; a locally computed hash alone is not publisher authentication.",
);
