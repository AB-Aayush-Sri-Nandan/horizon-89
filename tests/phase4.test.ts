import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { solarPosition, smoothFlight } from "../src/lib/solar.ts";
import { inspectGlobalWAC } from "../src/science/geotiff.ts";
import {
  parseHorizons,
  fetchBody,
  validateQuery,
} from "../dist-server/server/horizons.js";
// Geographic registration fixture only; never installed in public/.
function tiff() {
  const width = 2880,
    height = 1440,
    citation = new TextEncoder().encode("Moon geographic test CRS|\0"),
    tags = [
      256, 257, 258, 259, 262, 273, 277, 278, 279, 274, 33550, 33922, 34735,
      34737,
    ],
    start = 8 + 2 + tags.length * 12 + 4,
    scale = start,
    tie = scale + 24,
    geo = tie + 48,
    ascii = geo + 40,
    pixel = ascii + citation.length,
    bytes = new Uint8Array(pixel + width * height),
    v = new DataView(bytes.buffer);
  bytes.set([73, 73]);
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  v.setUint16(8, tags.length, true);
  const entries:
    [[number, number, number, number]] | [number, number, number, number][] = [
    [256, 4, 1, width],
    [257, 4, 1, height],
    [258, 3, 1, 8],
    [259, 3, 1, 1],
    [262, 3, 1, 1],
    [273, 4, 1, pixel],
    [277, 3, 1, 1],
    [278, 4, 1, height],
    [279, 4, 1, width * height],
    [274, 3, 1, 1],
    [33550, 12, 3, scale],
    [33922, 12, 6, tie],
    [34735, 3, 20, geo],
    [34737, 2, citation.length, ascii],
  ];
  entries.sort((a, b) => a[0] - b[0]);
  entries.forEach(([tag, type, n, value], i) => {
    const p = 10 + i * 12;
    v.setUint16(p, tag, true);
    v.setUint16(p + 2, type, true);
    v.setUint32(p + 4, n, true);
    if (type === 3 && n === 1) v.setUint16(p + 8, value, true);
    else v.setUint32(p + 8, value, true);
  });
  [0.125, 0.125, 0].forEach((x, i) => v.setFloat64(scale + i * 8, x, true));
  [0, 0, 0, -180, 90, 0].forEach((x, i) => v.setFloat64(tie + i * 8, x, true));
  [
    1, 1, 0, 4, 1024, 0, 1, 2, 1025, 0, 1, 1, 2048, 0, 1, 32767, 2054, 0, 1,
    9102,
  ].forEach((x, i) => v.setUint16(geo + i * 2, x, true));
  bytes.set(citation, ascii);
  bytes.fill(65, pixel);
  bytes.fill(200, pixel, pixel + width);
  return { bytes, scale, tie };
}
test("schematic positions retain Earth–Moon relationship and easing is bounded without invented ephemerides", () => {
  for (const day of [0, 1, 100]) {
    const earth = solarPosition("Earth", day),
      moon = solarPosition("Moon", day);
    assert.ok(
      Math.abs(Math.hypot(moon[0] - earth[0], moon[2] - earth[2]) - 0.62) <
        1e-10,
    );
  }
  assert.equal(smoothFlight(-1), 0);
  assert.equal(smoothFlight(1), 1);
  assert.equal(smoothFlight(0.5), 0.5);
  assert.throws(() => solarPosition("fake", 0));
});
test("actual bundled NASA maps match provenance hashes and have equirectangular dimensions", async () => {
  const manifest = JSON.parse(
    await readFile("public/textures/planets/provenance.json", "utf8"),
  );
  assert.equal(manifest.assets.length, 6);
  for (const asset of manifest.assets) {
    assert.ok(
      asset.downloadUrl.startsWith("https://raw.githubusercontent.com/"),
    );
    assert.ok(asset.height * 2 === asset.width);
    const data = await readFile("public" + asset.path);
    assert.equal(createHash("sha256").update(data).digest("hex"), asset.sha256);
  }
  assert.match(
    manifest.assets.find((a: { body: string }) => a.body === "Venus")
      .interpretation,
    /False-color/,
  );
});
test("WAC registration checks seam, poles, north-up degrees and rejects ambiguous orientation", () => {
  const { bytes, scale } = tiff(),
    meta = inspectGlobalWAC(bytes);
  assert.equal(meta.width, 2880);
  assert.equal(meta.height, 1440);
  assert.deepEqual(meta.bounds, {
    north: 90,
    south: -90,
    west: -180,
    east: 180,
  });
  assert.equal(meta.degreesPerPixel, 0.125);
  const bad = bytes.slice();
  new DataView(bad.buffer).setFloat64(scale, 0.25, true);
  assert.throws(() => inspectGlobalWAC(bad), /Registration/);
  assert.throws(() => inspectGlobalWAC(bytes.slice(0, 20)));
});
test("manual TIFF import verifies actual file metadata/checksum and preserves source identity (synthetic contract)", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "h89-wac-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { bytes } = tiff(),
    input = join(dir, "fixture.tif"),
    review = join(dir, "review.json"),
    out = join(dir, "lroc-moon.jpg");
  await writeFile(input, bytes);
  const source = {
    productId: "WAC_GLOBAL_E000N0000_008P",
    sourceUrl:
      "https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P",
    target: "MOON",
    datum: "TEST ONLY",
    license: "TEST ONLY",
    attribution: "Synthetic contract; not a real LROC observation",
    retrievedAt: "2026-11-09T00:00:00Z",
    registrationChecked: true,
    expectedSha256: createHash("sha256").update(bytes).digest("hex"),
  };
  await writeFile(review, JSON.stringify(source));
  const args = [
      "--experimental-strip-types",
      "scripts/science/import-moon.ts",
      input,
      review,
      out,
    ],
    result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(
    await readFile(join(dir, "lroc-moon.json"), "utf8"),
  );
  assert.equal(manifest.sourceSha256, source.expectedSha256);
  assert.match(manifest.conversion, /no crop, flip, rotation/);
  source.expectedSha256 = "0".repeat(64);
  await writeFile(review, JSON.stringify(source));
  const bad = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /checksum mismatch/);
});
test("JPL airless long and short column aliases are equivalent; refracted or duplicate columns rejected", () => {
  const short =
    "Date__(UT)__HR:MN, , , Azi_(a-app), Elev_(a-app),\n$$SOE\n2025-Mar-02 06:00, , , 180, -1,\n$$EOE";
  assert.deepEqual(
    parseHorizons(short),
    parseHorizons(
      short
        .replace("Azi_(a-app)", "Azimuth_(a-app)")
        .replace("Elev_(a-app)", "Elevation_(a-app)"),
    ),
  );
  assert.throws(
    () => parseHorizons(short.replace("Azi_(a-app)", "Azi_(r-app)")),
    /supported airless/,
  );
  assert.throws(
    () =>
      parseHorizons(
        short.replace("Elev_(a-app),", "Azi_(a-app), Elev_(a-app),"),
      ),
    /Ambiguous/,
  );
});
test("network, bad JSON, upstream errors and unsupported output retain distinct error codes", async () => {
  const site = validateQuery(
    new URLSearchParams({ lat: "-89", lon: "0", time: "2025-03-02T06:00:00Z" }),
  );
  for (const [fetcher, code] of [
    [
      async () => {
        throw new Error("network");
      },
      "NETWORK_ERROR",
    ],
    [async () => new Response("html"), "UPSTREAM_FORMAT"],
    [async () => Response.json({ error: "bad request" }), "UPSTREAM_ERROR"],
  ] as const) {
    await assert.rejects(
      fetchBody("10", site, fetcher),
      (error) => (error as { code: string }).code === code,
    );
  }
});
