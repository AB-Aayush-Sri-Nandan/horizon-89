import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../dist-server/server/index.js";

test("research sessions are isolated, configurable, and never return credentials", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const server = createApp({ aiKey: "" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const originalFetch = globalThis.fetch;
  const providerCalls: string[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://api.openai.com/v1/models") {
      providerCalls.push(url);
      assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, "Bearer test-key-12345");
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "gpt-test" }, { id: "unrelated" }] }), { status: 200 }));
    }
    if (url === "https://generativelanguage.googleapis.com/v1beta/models") {
      providerCalls.push(url);
      assert.equal(init?.headers && (init.headers as Record<string, string>)["x-goog-api-key"], "gemini-key-12345");
      return Promise.resolve(new Response(JSON.stringify({ models: [
        { name: "models/gemini-test", displayName: "Gemini Test", supportedGenerationMethods: ["generateContent"] },
        { name: "models/embed-only", supportedGenerationMethods: ["embedContent"] },
      ] }), { status: 200 }));
    }
    return originalFetch(input, init);
  }) as typeof fetch;
  try {
    const headers = { Origin: base, "Content-Type": "application/json" };
    let response = await originalFetch(`${base}/api/session/config`);
    assert.deepEqual(await response.json(), { configured: false });

    response = await originalFetch(`${base}/api/session/config`, {
      method: "POST", headers,
      body: JSON.stringify({ provider: "openai", key: "test-key-12345", model: "gpt-test" }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.match(cookie ?? "", /^h89_session=[a-f0-9]{64}$/);
    assert.match(response.headers.get("set-cookie") ?? "", /; Secure$/);
    const created = await response.text();
    assert(!created.includes("test-key-12345"));
    assert.deepEqual(JSON.parse(created).provider, "openai");

    response = await originalFetch(`${base}/api/session/config`, { headers: { Cookie: cookie! } });
    assert.equal((await response.json() as { configured: boolean }).configured, true);
    response = await originalFetch(`${base}/api/session/config`);
    assert.equal((await response.json() as { configured: boolean }).configured, false);

    response = await originalFetch(`${base}/api/session/test`, {
      method: "POST", headers: { ...headers, Cookie: cookie! }, body: "{}",
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json() as { models: { id: string }[] }).models, [{ id: "gpt-test", name: "gpt-test" }]);
    assert.deepEqual(providerCalls, ["https://api.openai.com/v1/models"]);

    response = await originalFetch(`${base}/api/session/config`, {
      method: "POST", headers: { ...headers, Cookie: cookie! }, body: JSON.stringify({ model: "gpt-new" }),
    });
    assert.equal(response.status, 200);
    const rotated = response.headers.get("set-cookie")?.split(";")[0];
    assert.notEqual(rotated, cookie);
    response = await originalFetch(`${base}/api/session/config`, { headers: { Cookie: cookie! } });
    assert.equal((await response.json() as { configured: boolean }).configured, false);

    response = await originalFetch(`${base}/api/research/copilot`, {
      method: "POST", headers: { ...headers, Cookie: rotated! }, body: JSON.stringify({ message: "What evidence supports this mission?" }),
    });
    assert.equal(response.status, 200);
    const answer = await response.json() as { dataState: string; citations: unknown[] };
    assert.equal(answer.dataState, "unavailable");
    assert.deepEqual(answer.citations, []);

    response = await originalFetch(`${base}/api/session/config`, {
      method: "DELETE", headers: { ...headers, Cookie: rotated! },
    });
    assert.equal(response.status, 200);
    response = await originalFetch(`${base}/api/session/config`, { headers: { Cookie: rotated! } });
    assert.equal((await response.json() as { configured: boolean }).configured, false);

    response = await originalFetch(`${base}/api/session/test`, {
      method: "POST", headers,
      body: JSON.stringify({ provider: "gemini", key: "gemini-key-12345" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json() as { models: { id: string; name: string }[] }).models, [
      { id: "gemini-test", name: "Gemini Test" },
    ]);
    assert.equal(providerCalls.length, 2);

    response = await originalFetch(`${base}/api/session/config`, {
      method: "POST", headers: { ...headers, Origin: "https://attacker.example" },
      body: JSON.stringify({ provider: "openai", key: "test-key-12345" }),
    });
    assert.equal(response.status, 403);
    response = await originalFetch(`${base}/api/session/config`, {
      method: "POST", headers: { ...headers, "X-Forwarded-Proto": "https" },
      body: JSON.stringify({ provider: "openai", key: "test-key-12345" }),
    });
    assert.equal(response.status, 403);
    response = await originalFetch(`${base}/api/session/config`, {
      method: "POST", headers: { ...headers, Origin: base.replace("http:", "https:"), "X-Forwarded-Proto": "https" },
      body: JSON.stringify({ provider: "openai", key: "test-key-12345" }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /; Secure$/);
    response = await originalFetch(`${base}/api/session/config`, {
      method: "POST", headers: { ...headers, "X-Forwarded-Proto": "https,http" },
      body: JSON.stringify({ provider: "openai", key: "test-key-12345" }),
    });
    assert.equal(response.status, 403);
    for (const [origin, forwardedProto, expected] of [
      [base, undefined, 503],
      [base.replace("http:", "https:"), "https", 503],
      [base, "https", 403],
      [base, "https,http", 403],
    ] as const) {
      const apiHeaders: Record<string, string> = { ...headers, Origin: origin };
      if (forwardedProto) apiHeaders["X-Forwarded-Proto"] = forwardedProto;
      response = await originalFetch(`${base}/api/copilot`, {
        method: "POST", headers: apiHeaders, body: JSON.stringify({ question: "Hello" }),
      });
      assert.equal(response.status, expected);
    }
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    globalThis.fetch = originalFetch;
    server.close();
    await once(server, "close");
  }
});
