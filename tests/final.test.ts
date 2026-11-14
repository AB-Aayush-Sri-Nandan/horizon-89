import { test } from "node:test";
import assert from "node:assert/strict";
import { requestJSON } from "../src/services/horizons.ts";

test("client rejects malformed successful responses instead of presenting an empty scientific result", async (t) => {
  for (const response of [
    new Response("<html>no backend</html>"),
    Response.json(null),
    Response.json([]),
  ]) {
    t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(requestJSON("/api/example"), /non-JSON|invalid JSON/);
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "Source unavailable" }, { status: 503 }),
  );
  await assert.rejects(requestJSON("/api/example"), /Source unavailable/);
});

test("client retains its deadline when a caller provides a cancellation signal", async (t) => {
  const caller = new AbortController(),
    deadline = new AbortController();
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 25000);
    return deadline.signal;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) =>
      new Promise((_resolve, reject) => {
        options.signal!.addEventListener(
          "abort",
          () => reject(options.signal!.reason),
          { once: true },
        );
        deadline.abort(new DOMException("Deadline reached", "TimeoutError"));
      }),
  );
  await assert.rejects(requestJSON("/api/example", { signal: caller.signal }), {
    name: "TimeoutError",
  });
  assert.equal(caller.signal.aborted, false);
});
