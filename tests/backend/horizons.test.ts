import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildHorizonsURL, parseObserverQuery, parseHorizonsResult, parseCSV, normalizeEastLongitude, HorizonsService} from '../../server/horizons.ts';
import {ApiError} from '../../server/errors.ts';
const utc = '2026-10-10T06:00:00.123Z';
const input = {latitude: -89, longitude: 0, altitudeKm: 0, timeUTC: utc};
const sun = readFileSync(new URL('../fixtures/sun-observer.txt', import.meta.url), 'utf8');
const earth = readFileSync(new URL('../fixtures/earth-observer.txt', import.meta.url), 'utf8');
const upstream: typeof fetch = async url => Response.json({signature: {version: 'FIXTURE'}, result: String(url).includes('COMMAND=%2710%27') ? sun : earth});
const failure = (code: string) => (e: unknown) => e instanceof ApiError && e.code === code;

test('strict query parsing includes signed coordinates, bounded altitude and millisecond UTC', () => {
  assert.deepEqual(parseObserverQuery({lat: '-89', lon: '-180', alt: '-1.5', time: utc}), {...input, longitude: -180, altitudeKm: -1.5});
  assert.equal(parseObserverQuery({lat: '-89', lon: '0', time: utc}).altitudeKm, 0);
  for (const patch of [{lat: ''}, {lat: '91'}, {lat: 'NaN'}, {lat: ['-89','0']}, {lon: '181'}, {lon: 'Infinity'}, {lon: '1e2'}, {alt: '-20.01'}, {alt: '100.1'}, {alt: ''}, {time: '2026-02-30T00:00:00.000Z'}, {time: '2026-10-10T06:00:00Z'}, {url: 'https://evil.test'}]) {
    assert.throws(() => parseObserverQuery({lat: '-89', lon: '0', time: utc, ...patch}), failure('VALIDATION_ERROR'));
  }
});
test('longitude normalization is safe and preserves UI-boundary semantics', () => {
  assert.equal(normalizeEastLongitude(-180), 180); assert.equal(normalizeEastLongitude(180), 180);
  assert.equal(normalizeEastLongitude(-1), 359); assert.equal(normalizeEastLongitude(-0), 0);
  assert.throws(() => normalizeEastLongitude(360), failure('VALIDATION_ERROR'));
});
test('both fixed target IDs use lunar geodetic observer, AIRLESS apparent quantity 4 and exact UTC', () => {
  for (const target of ['10','399'] as const) {
    const url = buildHorizonsURL(target, {...input, longitude: -10, altitudeKm: 1.25});
    assert.equal(url.origin + url.pathname, 'https://ssd.jpl.nasa.gov/api/horizons.api');
    const p = url.searchParams;
    for (const [key,value] of Object.entries({COMMAND: `'${target}'`, CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'", SITE_COORD: "'350,-89,1.25'", EPHEM_TYPE: "'OBSERVER'", QUANTITIES: "'4'", APPARENT: "'AIRLESS'", TLIST: "'2026-10-10 06:00:00.123'", TLIST_TYPE: "'CAL'", TIME_TYPE: "'UT'", TIME_DIGITS: "'FRACSEC'", CSV_FORMAT: "'YES'", EXTRA_PREC: "'YES'"})) {
      assert.equal(p.get(key), value, key);
    }
  }
});
test('CSV supports blank flags, quoted fields and escaped quotes; rejects malformed quoting', () => {
  assert.deepEqual(parseCSV('a, ,"b,c","d""e",'), ['a','','b,c','d"e','']);
  assert.throws(() => parseCSV('a,"bad')); assert.throws(() => parseCSV('a,"b"junk'));
});
test('parser preserves historical fixture precision for each target', () => {
  assert.deepEqual(parseHorizonsResult(sun,'10',utc), {azimuthDegrees:189.965237693,elevationDegrees:0.208258608});
  assert.deepEqual(parseHorizonsResult(earth,'399',utc), {azimuthDegrees:4.934865511,elevationDegrees:-3.873679512});
});
test('parser maps columns by header rather than numeric position', () => {
  const reordered = sun.replace('Azi____(a-app), Elev_(a-app)', 'Elev_(a-app), Azi____(a-app)').replace('189.965237693, 0.208258608','0.208258608, 189.965237693');
  assert.equal(parseHorizonsResult(reordered, '10', utc).elevationDegrees, 0.208258608);
});
test('rejects wrong target/centre/epoch, refracted tables, missing/multiple rows and invalid angles', () => {
  for (const bad of [sun.replace('(10)', '(399)'), sun.replace('Moon (301)', 'Earth (399)'),
    sun.replace('00.123,','00.124,'), sun.replace('(a-app)', '(r-app)'), sun.replace('NO (AIRLESS)', 'YES (REFRACTED)'), sun.replace('$$SOE',''),
    sun.replace('$$EOE','$$SOE\n$$EOE'), sun.replace('189.965237693', 'n.a.'), sun.replace('0.208258608', '91'),
    sun.replace('189.965237693', '360'), sun.replace('$$EOE','2026-Oct-10 06:00:00.123, , , 1, 2,\n$$EOE')]) {
    assert.throws(() => parseHorizonsResult(bad, '10', utc), failure('UPSTREAM_PARSE_ERROR'));
  }
});
test('successful cache preserves original retrieval time, expires at TTL and never mutates signed input', async () => {
  let now = Date.parse(utc); let calls = 0;
  const service = new HorizonsService({now: () => now, cacheTtlMs: 100, fetchImpl: async (...args) => {calls++;return upstream(...args);}});
  const first = await service.geometry({...input, longitude: -180});
  assert.equal(first.status, 'LIVE'); assert.equal(first.lunarSite.longitude, -180);
  now += 99;
  const cached = await service.geometry({...input, longitude: 180});
  assert.equal(cached.status, 'CACHED'); assert.equal(cached.lunarSite.longitude, 180);
  assert.equal(cached.provenance?.producedAtUTC, first.provenance?.producedAtUTC);
  assert.equal(cached.sun.provenance?.cacheStatus, 'HIT'); assert.equal(calls, 2);
  now++;
  assert.equal((await service.geometry({...input, longitude: -180})).status, 'LIVE'); assert.equal(calls, 4);
});
test('cache key includes altitude and exact milliseconds; capacity is bounded', async () => {
  let calls = 0;
  const service = new HorizonsService({maxCacheEntries: 2, fetchImpl: async url => {
    calls++; const u = new URL(String(url)); const source = u.searchParams.get('COMMAND') === "'10'" ? sun : earth;
    const epoch = u.searchParams.get('TLIST')!.slice(1,-1).replace('2026-10-', '2026-Oct-');
    return Response.json({result: source.replace('2026-Oct-10 06:00:00.123', epoch)});
  }});
  await service.geometry(input); await service.geometry({...input, altitudeKm: 1});
  await service.geometry(input); assert.equal(calls, 6); // Original pair evicted.
  await service.geometry({...input, timeUTC: '2026-10-10T06:00:00.124Z'}); assert.equal(calls, 8);
});
test('concurrent identical requests coalesce without claiming a cached retrieval', async () => {
  let calls = 0;
  const service = new HorizonsService({fetchImpl: async (...args) => {calls++;await new Promise(r => setTimeout(r, 10));return upstream(...args);}});
  const results = await Promise.all(Array.from({length: 8}, () => service.geometry(input)));
  assert.equal(calls, 2); assert.ok(results.every(r => r.status === 'LIVE'));
  assert.equal((await service.geometry(input)).status, 'CACHED');
});
test('failed requests are not cached as valid geometry and fresh retry can succeed', async () => {
  let broken = true; let calls = 0;
  const service = new HorizonsService({fetchImpl: async (...args) => {calls++;return broken ? Response.json({error: 'LTKERNL / IP_ADDR diagnostic'}) : upstream(...args);}});
  await assert.rejects(service.geometry(input), failure('UPSTREAM_UNAVAILABLE'));
  broken = false;
  const good = await service.geometry(input);
  assert.equal(good.status, 'LIVE'); assert.equal(calls, 4);
  assert.ok(good.sun.azimuthDegrees > 0);
});
test('HTTP, JSON, missing body/result and invalid tables fail without numerical fallback', async () => {
  const responses = [new Response('bad', {status: 503}), new Response('<html>'), Response.json(null), Response.json({}), Response.json({result:'not science'})];
  for (const response of responses) {
    const service = new HorizonsService({fetchImpl: async () => response.clone()});
    await assert.rejects(service.geometry(input), (e: unknown) => e instanceof ApiError && !('sun' in e));
  }
});
test('timeout aborts upstream requests with typed timeout', async () => {
  const service = new HorizonsService({timeoutMs: 10, fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
    options!.signal!.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
  })});
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(service.geometry(input), failure('UPSTREAM_TIMEOUT')); } finally { clearTimeout(keepAlive); }
});
test('content-length and streamed response-size limits reject oversized data', async () => {
  for (const headers of [new Headers(), new Headers({'content-length':'10000'})]) {
    const service = new HorizonsService({maxResponseBytes: 100, fetchImpl: async () => new Response('x'.repeat(101), {headers})});
    await assert.rejects(service.geometry(input), failure('UPSTREAM_PARSE_ERROR'));
  }
});
test('outbound redirects are forbidden and request uses an abort signal', async () => {
  let calls = 0;
  const service = new HorizonsService({fetchImpl: async (...args) => {
    calls++; assert.equal(args[1]?.redirect, 'error'); assert.ok(args[1]?.signal instanceof AbortSignal); return upstream(...args);
  }});
  await service.geometry(input); assert.equal(calls, 2);
});
test('concurrency capacity rejects excess different requests', async () => {
  const service = new HorizonsService({maxConcurrent: 2, fetchImpl: async (...args) => {await new Promise(r => setTimeout(r, 20));return upstream(...args);}});
  const first = service.geometry(input);
  await assert.rejects(service.geometry({...input, altitudeKm: 1}), failure('RATE_LIMITED'));
  await first;
});
test('provenance records source version, original epoch, apparent convention and limitations', async () => {
  const result = await new HorizonsService({fetchImpl: upstream}).geometry(input);
  assert.equal(result.provenance?.sourceVersion, 'FIXTURE');
  assert.equal(result.provenance?.observationTimeUTC, utc);
  assert.equal(result.provenance?.aberrationCorrection, 'AIRLESS_APPARENT');
  assert.equal(result.sun.terrainVisibilityEvaluated, false);
  assert.equal(result.sun.geometricallyAboveHorizon, true);
  assert.equal(result.earth.geometricallyAboveHorizon, false);
  assert.equal(result.provenance?.kernelSetId, undefined);
});
