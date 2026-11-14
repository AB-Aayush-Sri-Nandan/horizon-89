import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { makeServer } from './index.mjs';

test('API exposes status, protects mutations, and clears in-memory credentials', async () => {
  const server = makeServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = 'http://127.0.0.1:5173';
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const horizons = await fetch(`${base}/api/horizons?lat=-89&lon=0`);
    assert.equal(horizons.status, 503);
    assert.match((await horizons.json()).error, /not configured/i);

    const blocked = await fetch(`${base}/api/session/config`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://malicious.example' },
      body: JSON.stringify({ provider: 'openai', key: 'test-credential-123' }),
    });
    assert.equal(blocked.status, 403);

    const oversized = await fetch(`${base}/api/session/config`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ provider: 'openai', key: 'x'.repeat(40_000) }),
    });
    assert.equal(oversized.status, 413);

    const save = await fetch(`${base}/api/session/config`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ provider: 'openai', key: 'test-credential-123', model: 'gpt-test' }),
    });
    assert.equal(save.status, 200);
    const cookie = save.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie, /^h89_session=[a-f0-9]{64}$/);
    assert.match(save.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const saved = await save.text();
    assert.doesNotMatch(saved, /test-credential-123/);

    const status = await fetch(`${base}/api/session/config`, { headers: { cookie } });
    assert.deepEqual(((await status.json()).configured), true);

    const providerSwap = await fetch(`${base}/api/session/config`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin, cookie },
      body: JSON.stringify({ provider: 'gemini' }),
    });
    assert.equal(providerSwap.status, 400);

    const noEvidence = await fetch(`${base}/api/copilot`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin, cookie },
      body: JSON.stringify({ message: 'Unknown lunar telemetry 12345', context: { region: 'South Pole' } }),
    });
    assert.equal(noEvidence.status, 200);
    assert.equal((await noEvidence.json()).dataState, 'unavailable');

    const removed = await fetch(`${base}/api/session/config`, { method: 'DELETE', headers: { origin, cookie } });
    assert.equal(removed.status, 200);
    const after = await fetch(`${base}/api/session/config`, { headers: { cookie } });
    assert.equal((await after.json()).configured, false);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
