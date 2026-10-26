import test from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {createApp} from '../../server/app.ts';
import {HorizonsService} from '../../server/horizons.ts';
import {parseLegacyHorizons, adaptLegacyHorizons} from '../../src/science/horizons.ts';
const sun = readFileSync(new URL('../fixtures/sun-observer.txt', import.meta.url),'utf8');
const earth = readFileSync(new URL('../fixtures/earth-observer.txt', import.meta.url),'utf8');
const query = '/api/horizons?lat=-89&lon=0&alt=0&time=2026-10-10T06%3A00%3A00.123Z';
async function withAPI(options: Parameters<typeof createApp>[0], run: (base: string) => Promise<void>) {
  const server = createApp({logger: () => {}, ...options}).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { server.closeAllConnections(); await new Promise<void>((resolve,reject) => server.close(e => e ? reject(e) : resolve())); }
}
const fixtureService = () => new HorizonsService({fetchImpl: async url => Response.json({result: new URL(String(url)).searchParams.get('COMMAND') === "'10'" ? sun : earth})});
test('health is liveness only and security headers do not claim upstream readiness', async () => {
  await withAPI({}, async base => {
    const response = await fetch(base + '/api/health');
    assert.equal(response.status, 200); assert.equal((await response.json()).upstreamChecked, false);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('cache-control')!, /no-store/);
    assert.match(response.headers.get('x-request-id')!, /^[a-f0-9-]{36}$/);
  });
});
test('real HTTP endpoint returns wire-compatible provenance and successful cache reuse', async () => {
  await withAPI({service: fixtureService()}, async base => {
    const first = await fetch(base + query); assert.equal(first.status, 200);
    const data = parseLegacyHorizons(await first.json());
    assert.equal(data.status, 'LIVE'); assert.equal(data.sun.azimuthDegrees, 189.965237693);
    assert.equal(data.lunarSite.altitudeKm, 0);
    const adapted = adaptLegacyHorizons(data);
    assert.equal(adapted.provenance.producedAtUTC, data.provenance?.producedAtUTC);
    const second = await (await fetch(base + query)).json();
    assert.equal(second.status, 'CACHED');
    assert.equal(second.provenance.producedAtUTC, data.provenance?.producedAtUTC);
    assert.notEqual(second.requestId, data.requestId);
  });
});
test('invalid input returns structured UNAVAILABLE without calling the science service', async () => {
  let calls = 0;
  await withAPI({service: {geometry: async () => {calls++;throw new Error('must not call');}}}, async base => {
    for (const q of ['lat=91&lon=0&time=x', 'lat=-89&lon=181&time=x', 'lat=-89&lat=0&lon=0&time=x', 'lat=-89&lon=0&alt=NaN&time=x']) {
      const response = await fetch(base + '/api/horizons?' + q);
      assert.equal(response.status, 400); const d = await response.json();
      assert.equal(d.status, 'UNAVAILABLE'); assert.equal(d.error.code, 'VALIDATION_ERROR');
      assert.equal(d.sun, undefined);
    }
    assert.equal(calls, 0);
  });
});
test('upstream diagnostic is retained in server log and safe unavailable response has no angles', async () => {
  const logs: Record<string,unknown>[] = [];
  const diagnostic = 'wldini(): missing required file LTKERNL; ; ERROR in VLRDC: Var not declared: IP_ADDR';
  await withAPI({logger: e => logs.push(e), service: new HorizonsService({fetchImpl: async () => Response.json({error: diagnostic})})}, async base => {
    const response = await fetch(base + query); assert.equal(response.status, 502);
    const d = await response.json(); assert.equal(d.status, 'UNAVAILABLE'); assert.equal(d.sun, undefined);
    assert.equal(d.error.code, 'UPSTREAM_UNAVAILABLE'); assert.equal(d.error.retryable, true);
    assert.equal(logs[0].upstreamDiagnostic, diagnostic);
    assert.equal(d.stack, undefined); assert.equal(d.error.stack, undefined);
  });
});
test('unexpected internal errors never expose stack traces or secret-looking error text', async () => {
  await withAPI({service: {geometry: async () => {throw new Error('private credential value');}}}, async base => {
    const response = await fetch(base + query); assert.equal(response.status, 500);
    const text = await response.text(); assert.doesNotMatch(text, /private|credential|stack/);
  });
});
test('Copilot compatibility is unavailable and does not echo prompts or activate providers', async () => {
  await withAPI({}, async base => {
    const response = await fetch(base + '/api/copilot', {method:'POST', headers:{'content-type':'application/json'},body:JSON.stringify({message:'private prompt'})});
    assert.equal(response.status, 503); const text = await response.text();
    assert.match(text, /UNAVAILABLE/); assert.doesNotMatch(text, /private prompt/);
    const invalid = await fetch(base + '/api/copilot', {method:'POST',headers:{'content-type':'application/json'},body:'{"message":""}'});
    assert.equal(invalid.status, 400);
  });
});
test('JSON size and parse errors are controlled without body echo', async () => {
  await withAPI({}, async base => {
    for (const [body, status] of [['{"secret":',400], [JSON.stringify({message:'x'.repeat(9000)}),413]] as const) {
      const response = await fetch(base + '/api/copilot', {method:'POST',headers:{'content-type':'application/json'},body});
      assert.equal(response.status, status); assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    }
  });
});
test('rate limiter is bounded, supplies retry-after and resets its time window', async () => {
  let now = 0;
  await withAPI({now: () => now, rateLimit: 1, service: fixtureService()}, async base => {
    assert.equal((await fetch(base + query)).status, 200);
    const limited = await fetch(base + query); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal((await fetch(base + '/api/health')).status, 200);
    now += 60_000; assert.equal((await fetch(base + query)).status, 200);
  });
});
