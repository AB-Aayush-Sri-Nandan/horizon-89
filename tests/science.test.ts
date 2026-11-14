import { test } from "node:test";
import assert from "node:assert/strict";
import {
  surfaceVector,
  validCoordinates,
  utcDay,
  advanceMinutes,
  formatCoordinates,
} from "../src/lib/science.ts";
import { missions, datasets } from "../src/data/catalog.ts";

test("lunar vector axes and east-positive longitude match texture UV convention", () => {
  assert.deepEqual(surfaceVector({ latitude: 0, longitude: 0 }), [1, 0, -0]);
  const east = surfaceVector({ latitude: 0, longitude: 90 });
  assert.ok(Math.abs(east[0]) < 1e-12);
  assert.equal(east[2], -1);
  const south = surfaceVector({ latitude: -90, longitude: 0 });
  assert.equal(south[1], -1);
});
test("surface vectors have requested radius across longitude seam and poles", () => {
  for (const latitude of [-90, -89, 0, 89, 90])
    for (const longitude of [-180, -90, 0, 180]) {
      assert.ok(
        Math.abs(Math.hypot(...surfaceVector({ latitude, longitude }, 3)) - 3) <
          1e-12,
      );
    }
});
test("coordinate validation rejects nonfinite, missing, and out-of-range values", () => {
  assert.equal(validCoordinates(-89, 0), true);
  assert.equal(validCoordinates(-90, 180), true);
  for (const pair of [
    [NaN, 0],
    [Infinity, 0],
    [0, 181],
    [-91, 0],
    [null, 0],
    ["", 0],
  ])
    assert.equal(validCoordinates(...(pair as [unknown, unknown])), false);
});
test("timeline uses UTC and playback speed is simulation seconds per real second", () => {
  assert.equal(utcDay("2024-02-29", 360), "2024-02-29T06:00:00.000Z");
  assert.equal(advanceMinutes(0, 60, 1), 1);
  assert.equal(advanceMinutes(1438, 600, 60), 1439);
  assert.equal(utcDay("2025-01-01", 2000), "2025-01-01T23:59:00.000Z");
  assert.throws(() => utcDay("invalid", 0));
  assert.throws(() => utcDay("2025-02-30", 0));
});
test("unverified mission coordinates never become markers and records cite historical sources", () => {
  for (const mission of missions) {
    assert.equal(mission.coordinates, null);
    assert.ok(mission.source.url.startsWith("https://www.nasa.gov/"));
    assert.ok(mission.source.asOf);
    assert.ok(mission.events.length);
  }
  assert.equal(formatCoordinates(null), "Coordinates unverified");
  assert.ok(datasets.find((d) => d.id === "lola")?.available === false);
});
