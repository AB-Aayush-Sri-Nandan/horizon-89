import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  parsePDS3,
  geographicToPixel,
  pixelToGeographic,
  decodeElevation,
  slopeDegrees,
  groundSpacing,
  validateTerrainTile,
  sampleTerrain,
  type TerrainTile,
} from "../src/science/terrain.ts";
// Synthetic mathematical fixtures, not lunar science assets. Never bundled in public/.
const label = `PDS_VERSION_ID = PDS3
PRODUCT_ID = "SYNTHETIC_TEST_ONLY"
TARGET_NAME = MOON
PRODUCT_CREATION_TIME = 2020-01-01T00:00:00Z
^IMAGE = "fixture.img"
OBJECT = IMAGE
LINES = 5
LINE_SAMPLES = 5
SAMPLE_BITS = 16
SAMPLE_TYPE = LSB_INTEGER
SCALING_FACTOR = 0.5
OFFSET = 10
MISSING_CONSTANT = -32768
UNIT = METERS
END_OBJECT = IMAGE
OBJECT = IMAGE_MAP_PROJECTION
MAP_PROJECTION_TYPE = "POLAR STEREOGRAPHIC"
COORDINATE_SYSTEM_NAME = PLANETOCENTRIC
POSITIVE_LONGITUDE_DIRECTION = EAST
A_AXIS_RADIUS = 1737.4 <KM>
B_AXIS_RADIUS = 1737.4 <KM>
C_AXIS_RADIUS = 1737.4 <KM>
MAP_SCALE = 100000 <METERS/PIXEL>
CENTER_LATITUDE = -90
CENTER_LONGITUDE = 0
LINE_PROJECTION_OFFSET = 2
SAMPLE_PROJECTION_OFFSET = 2
END_OBJECT = IMAGE_MAP_PROJECTION
END`;
test("PDS metadata preserves identity, spherical reference, units, no-data and processing epoch", () => {
  const m = parsePDS3(label);
  assert.equal(m.productId, "SYNTHETIC_TEST_ONLY");
  assert.equal(m.radiusM, 1737400);
  assert.equal(m.mapScaleM, 100000);
  assert.equal(m.unit, "m");
  assert.equal(m.noData, -32768);
  assert.equal(m.scale, 0.5);
});
test("parser fails closed on ambiguous metadata, unsupported projection/encoding/units/convention", () => {
  for (const bad of [
    label.replace("TARGET_NAME = MOON", "TARGET_NAME = MARS"),
    label.replace("POLAR STEREOGRAPHIC", "MERCATOR"),
    label.replace("UNIT = METERS", "UNIT = FEET"),
    label.replace(
      "POSITIVE_LONGITUDE_DIRECTION = EAST",
      "POSITIVE_LONGITUDE_DIRECTION = WEST",
    ),
    label.replace("SAMPLE_BITS = 16", "SAMPLE_BITS = 8"),
    label.replace("MISSING_CONSTANT = -32768", ""),
    label.replace("CENTER_LATITUDE = -90", "CENTER_LATITUDE = -80"),
    label.replace("LINES = 5", "LINES = 5\nLINES = nope"),
    label.replace("C_AXIS_RADIUS = 1737.4", "C_AXIS_RADIUS = 1730.0"),
  ])
    assert.throws(() => parsePDS3(bad));
});
test("polar coordinate transform handles pole, cardinal directions and hemisphere rejection", () => {
  const m = parsePDS3(label);
  assert.deepEqual(geographicToPixel(m, -90, 0), [2, 2]);
  const north = geographicToPixel(m, -89, 0)!,
    east = geographicToPixel(m, -89, 90)!;
  assert.ok(north[1] < 2);
  assert.ok(east[0] > 2);
  assert.equal(geographicToPixel(m, 89, 0), null);
  assert.equal(geographicToPixel(m, NaN, 0), null);
});
test("cylindrical coordinates and global longitude seam use spherical metres", () => {
  const m = {
    ...parsePDS3(label),
    projection: "EQUIRECTANGULAR" as const,
    centerLatitude: 0,
    width: 360,
    height: 180,
    mapScaleM: (2 * Math.PI * 1737400) / 360,
    sampleOffset: 179.5,
    lineOffset: 89.5,
  };
  const a = geographicToPixel(m, 0, -180)!,
    b = geographicToPixel(m, 0, 180)!;
  assert.deepEqual(a, b);
  assert.ok(geographicToPixel(m, 0, 90)![0] > geographicToPixel(m, 0, 0)![0]);
  assert.equal(groundSpacing(m, 0), null);
});
test("signed integer decoding handles endian, scaling, offset and no-data before scaling", () => {
  const m = parsePDS3(label);
  const bytes = new ArrayBuffer(4),
    view = new DataView(bytes);
  view.setInt16(0, 100, true);
  view.setInt16(2, -32768, true);
  assert.equal(decodeElevation(view, 0, m), 60);
  assert.equal(decodeElevation(view, 2, m), null);
  view.setInt16(0, -20, false);
  assert.equal(
    decodeElevation(view, 0, { ...m, sampleType: "MSB_INTEGER" }),
    0,
  );
});
test("floating-point no-data and nonfinite values never become terrain", () => {
  const m = {
    ...parsePDS3(label),
    sampleBits: 32 as const,
    sampleType: "PC_REAL" as const,
    scale: 1,
    offset: 0,
  };
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, Infinity, true);
  assert.equal(decodeElevation(view, 0, m), null);
  view.setFloat32(0, 12.5, true);
  assert.equal(decodeElevation(view, 0, m), 12.5);
});
test("native central differences return flat and known plane slopes; missing neighbors invalidate", () => {
  assert.equal(slopeDegrees(0, 0, 0, 0, 10), 0);
  assert.ok(Math.abs(slopeDegrees(-10, 10, 0, 0, 10)! - 45) < 1e-10);
  assert.equal(slopeDegrees(null, 0, 0, 0, 1), null);
  assert.equal(slopeDegrees(0, 1, 0, 0, 0), null);
  const m = parsePDS3(label);
  assert.equal(groundSpacing(m, -90), m.mapScaleM);
  assert.ok(groundSpacing(m, -80)! < m.mapScaleM);
});
test("end-to-end CLI ingests binary synthetic DEM, records provenance and preserves nulls", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "h89-dem-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "fixture.lbl"), label);
  const view = new DataView(new ArrayBuffer(50));
  for (let i = 0; i < 25; i++) view.setInt16(i * 2, 100, true);
  view.setInt16(0, -32768, true);
  await writeFile(join(dir, "fixture.img"), new Uint8Array(view.buffer));
  await writeFile(
    join(dir, "provenance.json"),
    JSON.stringify({
      retrievedAt: "2020-01-02T00:00:00Z",
      productId: "SYNTHETIC_TEST_ONLY",
      url: "https://pds-geosciences.wustl.edu/test-only/fixture.img",
      labelUrl: "https://pds-geosciences.wustl.edu/test-only/fixture.lbl",
      datumDescription: "TEST ONLY relative to test sphere",
      license: "TEST ONLY",
      attribution: "Synthetic fixture, not lunar data",
    }),
  );
  const out = join(dir, "terrain.json"),
    args = [
      "--experimental-strip-types",
      "scripts/science/ingest-dem.ts",
      join(dir, "fixture.lbl"),
      join(dir, "fixture.img"),
      join(dir, "provenance.json"),
      out,
    ];
  const inspected = spawnSync(
    process.execPath,
    [...args.slice(0, 2), "--inspect", ...args.slice(2, 5)],
    { encoding: "utf8" },
  );
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.equal(JSON.parse(inspected.stdout).status, "input-checks-passed");
  await assert.rejects(readFile(out));
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const tile = validateTerrainTile(JSON.parse(await readFile(out, "utf8")));
  assert.equal(tile.width, 181);
  assert.equal(tile.source.retrievedAt, "2020-01-02T00:00:00Z");
  assert.notEqual(tile.source.processedAt, tile.source.retrievedAt);
  assert.equal(sampleTerrain(tile, -90, 0)?.elevationM, 60);
  assert.equal(tile.source.integrity, "local-sha256-only");
  assert.ok(tile.elevations.includes(null));
  assert.equal(sampleTerrain(tile, 0, 0), null);
  assert.ok(
    (await readFile(out + ".provenance.json", "utf8")).includes(
      "originalLabel",
    ),
  );
  const priorOutput = await readFile(out, "utf8");
  const provenance = JSON.parse(
    await readFile(join(dir, "provenance.json"), "utf8"),
  );
  provenance.expectedSha256 = "0".repeat(64);
  await writeFile(join(dir, "provenance.json"), JSON.stringify(provenance));
  const mismatch = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /checksum|SHA-256 mismatch/);
  assert.equal(await readFile(out, "utf8"), priorOutput);
  await writeFile(join(dir, "fixture.img"), new Uint8Array(2));
  const bad = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /size does not match/);
});
test("terrain artifact validation rejects invalid arrays and missing provenance", () => {
  assert.throws(() => validateTerrainTile({}));
  assert.throws(() =>
    validateTerrainTile({ version: 1, width: 99999, height: 99999 }),
  );
  const m = parsePDS3(label);
  const tile = {
    version: 1,
    metadata: m,
    width: 2,
    height: 2,
    bounds: { north: -80, south: -90, west: -180, east: 180 },
    elevations: [1, 2, 3, 4],
    slopes: [null, null, null, null],
  } as TerrainTile;
  assert.throws(() => validateTerrainTile(tile), /provenance/);
});

test("projected coordinate inverses preserve lunar locations at source pixel centers", () => {
  const m = parsePDS3(label);
  for (const [lat, lon] of [
    [-89, 0],
    [-85, 90],
    [-89, -90],
    [-89, 179],
  ]) {
    const p = geographicToPixel(m, lat, lon);
    assert.ok(p);
    const restored = pixelToGeographic(m, ...p);
    assert.ok(Math.abs(restored[0] - lat) < 1e-9);
    assert.ok(Math.abs(restored[1] - lon) < 1e-9);
  }
});
