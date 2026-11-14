import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readdir } from "node:fs/promises";
import { createApp } from "../dist-server/server/index.js";
import { missionCoordinates, missions } from "../src/data/catalog.ts";
test("release API rejects malformed contexts/origins/paths and preserves same-origin posts", async (t) => {
  const server = createApp({ aiKey: "" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const host = `127.0.0.1:${address.port}`,
    base = `http://${host}`;
  for (const body of [
    { question: "Test", history: "invalid" },
    { question: "Test", compareMissionIds: "im1" },
    { question: "Test", site: { latitude: -89, longitude: 0 } },
    { question: "Test", solarBody: "invented" },
  ]) {
    const r = await fetch(base + "/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(r.status, 400);
  }
  for (const origin of ["null", "invalid", "https://other.example"]) {
    const r = await fetch(base + "/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: '{"question":"Test"}',
    });
    assert.equal(r.status, 403);
  }
  const same = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: '{"question":"Test"}',
  });
  assert.equal(same.status, 503);
  assert.match((await same.json()).error, /H89_AI_API_KEY/);
  for (const path of ["/.env", "/assets/.secret", "/%2eenv", "/%5Coutside"])
    assert.equal((await fetch(base + path)).status, 404);
  assert.equal((await fetch(base + "/%ZZ")).status, 400);
  const health = await (await fetch(base + "/api/health")).json();
  assert.equal(health.version, "0.4.0-rc.1");
  assert.equal(health.copilotConfigured, false);
  const html = await fetch(base + "/");
  assert.equal(html.headers.get("cache-control"), "no-cache");
  assert.equal(html.headers.get("x-content-type-options"), "nosniff");
  const asset = (
    await readdir(new URL("../dist/assets/", import.meta.url))
  ).find((f) => f.endsWith(".js"))!;
  const js = await fetch(base + "/assets/" + asset);
  assert.match(js.headers.get("cache-control") ?? "", /immutable/);
});
test("landing provenance cannot claim verification with missing frame or invalid access date", () => {
  const candidate = {
    ...missions[0],
    coordinates: { latitude: -89, longitude: 0 },
    coordinateEvidence: {
      kind: "as-landed" as const,
      convention: "planetocentric / east-positive" as const,
      referenceFrame: "Synthetic lunar fixed test frame",
      datum: "Synthetic test datum",
      radiusM: 1737400,
      accessedOn: "2024-02-01",
      sourceUrl: "https://example.invalid/test-fixture",
      publishedOn: "2024-01-01",
      reviewedOn: "2024-02-01",
      precisionDegrees: 0.001,
      uncertaintyM: null,
    },
  };
  assert.ok(missionCoordinates(candidate));
  assert.equal(
    missionCoordinates({
      ...candidate,
      coordinateEvidence: {
        ...candidate.coordinateEvidence,
        referenceFrame: "",
      },
    }),
    null,
  );
  assert.equal(
    missionCoordinates({
      ...candidate,
      coordinateEvidence: {
        ...candidate.coordinateEvidence,
        accessedOn: "2024-02-30",
      },
    }),
    null,
  );
  assert.equal(
    missionCoordinates({
      ...candidate,
      coordinateEvidence: {
        ...candidate.coordinateEvidence,
        sourceUrl: "https://user:password@example.invalid",
      },
    }),
    null,
  );
});
