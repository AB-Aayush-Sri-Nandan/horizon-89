import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import {
  parseHorizons,
  validateQuery,
  fetchBody,
} from "../dist-server/server/horizons.js";
import { createApp } from "../dist-server/server/index.js";
import { missionCoordinates, missions } from "../src/data/catalog.ts";
const row =
  "Date__(UT)__HR:MN:SC.fff, , , Azi_(a-app), Elev_(a-app),\n$$SOE\n2024-Feb-29 00:00:00.000, , , 180, 0,\n$$EOE";
test("Horizons returned UTC must match including seconds and leap days", () => {
  const good = parseHorizons(row, "2024-02-29T00:00:00.000Z");
  assert.equal(good.returnedTimeUTC, "2024-02-29T00:00:00.000Z");
  for (const bad of [
    row.replace("2024-Feb-29", "2024-Mar-01"),
    row.replace("00:00:00.000", "00:00:01.000"),
    row.replace("$$EOE", ""),
  ])
    assert.throws(() => parseHorizons(bad, "2024-02-29T00:00:00.000Z"));
});
test("timeout is an unavailable error, not a fallback measurement", async () => {
  const site = validateQuery(
    new URLSearchParams({ lat: "-89", lon: "0", time: "2024-02-29T00:00:00Z" }),
  );
  await assert.rejects(
    fetchBody("10", site, async () => {
      throw new DOMException("Timed out", "TimeoutError");
    }),
    /could not be reached/,
  );
});
test("only reviewed as-landed provenance creates markers; non-landing mission never receives marker", () => {
  const verified = missions.filter((mission) => mission.coordinateEvidence);
  assert.ok(verified.length >= 2);
  for (const mission of verified) assert.deepEqual(missionCoordinates(mission), mission.coordinates);
  for (const mission of missions.filter((item) => !item.coordinateEvidence)) assert.equal(missionCoordinates(mission), null);
  const record = {
    ...missions[0],
    coordinates: { latitude: -89, longitude: 0 },
    coordinateEvidence: {
      referenceFrame: "Synthetic Moon-fixed test frame",
      datum: "Synthetic test datum",
      radiusM: 1737400,
      accessedOn: "2024-01-02",
      kind: "as-landed" as const,
      convention: "planetocentric / east-positive" as const,
      sourceUrl: "https://example.invalid/test-only",
      publishedOn: "2024-01-01",
      reviewedOn: "2024-01-02",
      precisionDegrees: 0.001,
      uncertaintyM: null,
    },
  };
  assert.deepEqual(missionCoordinates(record), record.coordinates);
  assert.equal(
    missionCoordinates({ ...record, landingOutcome: "no-landing" }),
    null,
  );
  assert.equal(
    missionCoordinates({
      ...record,
      coordinateEvidence: {
        ...record.coordinateEvidence,
        kind: "planned-target" as "as-landed",
      },
    }),
    null,
  );
});
test("science inventory unavailable is a successful explicit state; Copilot validates UTC without a key", async (t) => {
  const app = createApp({ aiKey: "" });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => app.close());
  const address = app.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  let r = await fetch(base + "/api/science");
  assert.equal(r.status, 200);
  const science = await r.json();
  assert.equal(science.state, "unavailable");
  assert.equal(science.tile, null);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Explain this site",
      timeUTC: "2025-03-02T12:00:00+01:00",
    }),
  });
  assert.equal(r.status, 400);
});
test("expired ephemeris cache is refetched, not presented as fresh", async (t) => {
  let now = Date.parse("2024-02-29T00:00:00Z"),
    calls = 0;
  const app = createApp({
    now: () => now,
    fetcher: async () => {
      calls++;
      return Response.json({ result: row });
    },
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => app.close());
  const address = app.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/horizons?lat=-89&lon=0&time=2024-02-29T00:00:00Z`;
  assert.equal((await (await fetch(url)).json()).cached, false);
  assert.equal((await (await fetch(url)).json()).cached, true);
  assert.equal(calls, 2);
  now += 300001;
  const refreshed = await (await fetch(url)).json();
  assert.equal(refreshed.cached, false);
  assert.equal(calls, 4);
  assert.equal(refreshed.fetchedAt, new Date(now).toISOString());
});

test("pre-1962 UT1 epochs are not mislabeled UTC", () => {
  assert.throws(
    () =>
      validateQuery(
        new URLSearchParams({
          lat: "0",
          lon: "0",
          time: "1961-01-01T00:00:00Z",
        }),
      ),
    /UT1/,
  );
});
