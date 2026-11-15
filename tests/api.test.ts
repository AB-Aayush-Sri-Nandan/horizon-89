import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../dist-server/server/index.js";
import {
  validateQuery,
  parseHorizons,
  horizonsURL,
  fetchBody,
} from "../dist-server/server/horizons.js";
const query = (lat = "-89", lon = "0", time = "2025-03-02T06:00:00Z") =>
  new URLSearchParams({ lat, lon, time });
const fixture =
  "Date__(UT)__HR:MN, , , Azi_(a-app), Elev_(a-app),\n$$SOE\n2025-Mar-02 06:00, , , 180.123, -1.25,\n$$EOE";
test("API accepts valid lunar observer coordinates and normalizes UTC", () => {
  assert.deepEqual(validateQuery(query()), {
    latitude: -89,
    longitude: 0,
    timeUTC: "2025-03-02T06:00:00.000Z",
  });
});
test("API rejects bad coordinates and malformed, non-UTC or out-of-range dates", () => {
  for (const q of [
    query(""),
    query("Infinity"),
    query("-91"),
    query("0", "181"),
    query("-89", "0", "2025-03-02"),
    query("-89", "0", "2025-02-30T00:00:00Z"),
    query("-89", "0", "1800-01-01T00:00:00Z"),
    query("-89", "0", "2025-03-02T00:00:00+01:00"),
  ])
    assert.throws(() => validateQuery(q));
});
test("Horizons parser respects named columns and rejects unavailable or malformed geometry", () => {
  assert.deepEqual(parseHorizons(fixture), {
    azimuthDegrees: 180.123,
    elevationDegrees: -1.25,
    geometricallyAboveHorizon: false,
    terrainVisibilityEvaluated: false,
  });
  for (const bad of [
    "",
    fixture.replace("180.123", "n.a."),
    fixture.replace("-1.25", "-100"),
    fixture.replace("$$EOE", "").replace("$$SOE", ""),
    fixture.replace("Elev_(a-app)", "other"),
  ])
    assert.throws(() => parseHorizons(bad));
});
test("Horizons request uses Moon geodetic frame, Sun or Earth, airless geometry and UTC", () => {
  const url = new URL(horizonsURL("10", validateQuery(query("-89", "-20"))));
  assert.equal(url.host, "ssd.jpl.nasa.gov");
  assert.equal(url.searchParams.get("CENTER"), "'coord@301'");
  assert.equal(url.searchParams.get("SITE_COORD"), "'-20,-89,0'");
  assert.equal(url.searchParams.get("APPARENT"), "'AIRLESS'");
  assert.equal(url.searchParams.get("QUANTITIES"), "'4'");
});
test("upstream failure returns unavailable and never manufactures geometry", async () => {
  await assert.rejects(
    fetchBody(
      "10",
      validateQuery(query()),
      async () => new Response("{}", { status: 503 }),
    ),
    /unavailable/,
  );
  await assert.rejects(
    fetchBody("399", validateQuery(query()), async () => {
      throw new Error("network denied");
    }),
    /could not be reached/,
  );
  await assert.rejects(
    fetchBody("10", validateQuery(query()), async () =>
      Response.json({ error: "bad" }),
    ),
    /could not calculate/,
  );
});
test("successful upstream fixture parses supported fields (contract test, not a live ephemeris)", async () => {
  const body = await fetchBody("399", validateQuery(query()), async () =>
    Response.json({ result: fixture }),
  );
  assert.equal(body.elevationDegrees, -1.25);
});
test("HTTP routes validate requests, protect origin, handle missing key and serve texture as image", async (t) => {
  const app = createApp();
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => app.close());
  const address = app.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  let r = await fetch(base + "/");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /HORIZON 89/);
  r = await fetch(base + "/api/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, "ok");
  r = await fetch(base + "/api/ready");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, "ready");
  r = await fetch(base + "/api/horizons?lat=999&lon=0&time=bad");
  assert.equal(r.status, 400);
  assert.ok((await r.json()).error);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{broken",
  });
  assert.equal(r.status, 400);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "" }),
  });
  assert.equal(r.status, 400);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "a".repeat(1501) }),
  });
  assert.equal(r.status, 400);
  if (!process.env.GROQ_API_KEY) {
    r = await fetch(base + "/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Explain IM-1", missionId: "im1" }),
    });
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /GROQ_API_KEY/);
  }
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hello",
  });
  assert.equal(r.status, 415);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://other.example",
    },
    body: "{}",
  });
  assert.equal(r.status, 403);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "x".repeat(20000) }),
  });
  assert.equal(r.status, 413);
  r = await fetch(base + "/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });
  assert.equal(r.status, 400);
  r = await fetch(base + "/api/unknown");
  assert.equal(r.status, 404);
  r = await fetch(base + "/textures/moon.jpg");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") ?? "", /image\/jpeg/);
  const bytes = new Uint8Array(await r.arrayBuffer());
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  r = await fetch(base + "/textures/does-not-exist.jpg");
  assert.equal(r.status, 404);
});
test("HTTP ephemeris cache and concurrent request deduplication use sourced responses only", async (t) => {
  let calls = 0;
  const app = createApp({
    fetcher: async () => {
      calls++;
      return Response.json({ result: fixture });
    },
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => app.close());
  const address = app.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/horizons?${query()}`;
  const responses = await Promise.all([fetch(url), fetch(url)]);
  for (const response of responses) assert.equal(response.status, 200);
  assert.equal(calls, 2);
  const cached = await (await fetch(url)).json();
  assert.equal(cached.cached, true);
  assert.equal(cached.sun.elevationDegrees, -1.25);
  assert.equal(cached.dataType, "calculated");
  assert.equal(calls, 2);
});
test("AI provider contract receives verified project context and bounded history (mock transport)", async (t) => {
  const app = createApp({
    aiKey: "unit-test-only-not-a-credential",
    fetcher: async (url, init) => {
      assert.equal(String(url), "https://api.groq.com/openai/v1/chat/completions");
      const body = JSON.parse(String(init?.body));
      assert.ok(body.messages[0].content.includes("IM-1"));
      assert.ok(body.messages[0].content.includes("Saturn"));
      assert.ok(body.messages[0].content.includes("studySite"));
      assert.equal(body.messages.at(-1).content, "Explain this mission");
      return Response.json({
        choices: [
          {
            message: {
              content: "Test transport response; not a live AI answer.",
            },
          },
        ],
      });
    },
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => app.close());
  const address = app.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Explain this mission",
      missionId: "im1",
      solarBody: "Saturn",
      site: { latitude: -89, longitude: 0 },
      timeUTC: "2025-03-02T06:00:00Z",
      history: [{ role: "system", content: "must not be forwarded" }],
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.source, /AI generated/);
  assert.equal(body.missionId, "im1");
});
