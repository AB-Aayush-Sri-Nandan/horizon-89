import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptLegacyHorizons, parseLegacyHorizons, validateSiteTime, formatAngle } from '../src/science/horizons.ts';
import { getLunarGeometry } from '../src/services/horizons.ts';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/horizons-legacy.json', import.meta.url), 'utf8'));

test('preserves historical numerical precision and UTC milliseconds in wire migration', () => {
  const d = adaptLegacyHorizons(fixture);
  assert.equal(d.sun.azimuthDegrees, 189.965237693);
  assert.equal(d.sun.elevationDegrees, 0.208258608);
  assert.equal(d.earth.azimuthDegrees, 4.934865511);
  assert.equal(d.earth.elevationDegrees, -3.873679512);
  assert.equal(d.time.utc, '2026-10-10T06:00:00.123Z');
  assert.equal(d.sun.referenceHorizonAbove, true);
  assert.equal(d.earth.referenceHorizonAbove, false);
});
test('adapter does not invent retrieval metadata or scientific frame', () => {
  const d = adaptLegacyHorizons(fixture);
  assert.equal(d.provenance.producedAtUTC, null);
  assert.equal(d.provenance.frame, null);
  assert.equal(d.provenance.aberrationCorrection, null);
  assert.equal(d.provenance.kernelSetId, undefined);
  assert.match(d.provenance.limitations.join(' '), /not verified/);
});
test('cached migration keeps unknown retrieval time and wire source unchanged', () => {
  const d = adaptLegacyHorizons({ ...fixture, status: 'CACHED' });
  assert.equal(d.status, 'CACHED');
  assert.equal(d.provenance.cacheStatus, 'HIT');
  assert.equal(d.provenance.producedAtUTC, null);
  assert.equal(fixture.status, 'LIVE');
});
test('unknown status never becomes LIVE', () => {
  assert.equal(adaptLegacyHorizons({ ...fixture, status: 'OK' }).status, 'UNAVAILABLE');
});
test('valid signed longitude boundaries are retained', () => {
  for (const longitude of [-180, 0, 180]) {
    const d = adaptLegacyHorizons({ ...fixture, lunarSite: {latitude: -89, longitude} });
    assert.equal(d.site.longitudeDegreesEast, longitude);
  }
});
test('rejects invalid latitude and longitude including infinities', () => {
  for (const lat of [-91, 91, NaN, Infinity]) assert.throws(() => validateSiteTime(lat, 0, fixture.timeUTC));
  for (const lon of [-181, 181, NaN, Infinity]) assert.throws(() => validateSiteTime(-89, lon, fixture.timeUTC));
});
test('rejects impossible, ambiguous, and non-millisecond UTC', () => {
  for (const utc of ['2026-02-30T06:00:00.123Z', 'garbage', '2026-10-10', '2026-10-10T06:00:00Z', '2026-10-10T06:00:00.123+00:00']) {
    assert.throws(() => validateSiteTime(-89, 0, utc));
  }
});
test('reference-horizon parser rejects inconsistent or terrain-enabled data', () => {
  for (const patch of [{ elevationDegrees: NaN }, { azimuthDegrees: 360 }, { geometricallyAboveHorizon: false }, { terrainVisibilityEvaluated: true }]) {
    assert.throws(() => parseLegacyHorizons({ ...fixture, sun: { ...fixture.sun, ...patch } }));
  }
  const zero = parseLegacyHorizons({ ...fixture, sun: { ...fixture.sun, elevationDegrees: 0, geometricallyAboveHorizon: false } });
  assert.equal(zero.sun.geometricallyAboveHorizon, false);
});
test('formatting retains three decimals and explicit elevation sign', () => {
  assert.equal(formatAngle(fixture.sun.elevationDegrees, true), '+0.208°');
  assert.equal(formatAngle(fixture.earth.elevationDegrees, true), '−3.874°');
  assert.equal(formatAngle(fixture.sun.azimuthDegrees), '189.965°');
  assert.equal(formatAngle(null), 'N/A');
});
test('client sends exact UTC/signed longitude and rejects mismatched response', async (t) => {
  let url = '';
  t.mock.method(globalThis, 'fetch', async (input: string) => { url = input; return Response.json(fixture); });
  const result = await getLunarGeometry(-89, 0, fixture.timeUTC);
  assert.equal(new URL(url, 'http://localhost').searchParams.get('time'), fixture.timeUTC);
  assert.equal(result.sun.azimuthDegrees, fixture.sun.azimuthDegrees);
  await assert.rejects(getLunarGeometry(-88, 0, fixture.timeUTC), /does not match/);
});
test('client never leaks server error details or substitutes fake data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('secret stack trace', {status: 502}));
  await assert.rejects(getLunarGeometry(-89, 0, fixture.timeUTC), (e: Error) => {
    assert.match(e.message, /unavailable/); assert.doesNotMatch(e.message, /secret|stack/); return true;
  });
});
test('invalid JSON and network timeout reject with safe errors', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('<html>not JSON</html>'));
  await assert.rejects(getLunarGeometry(-89, 0, fixture.timeUTC), /Invalid Horizons JSON/);
  mock.mock.mockImplementation(async () => { throw new DOMException('aborted', 'TimeoutError'); });
  await assert.rejects(getLunarGeometry(-89, 0, fixture.timeUTC), /failed or timed out/);
});

test('nonzero altitude must be echoed by the backend, and invalid altitude is rejected', async (t) => {
  let sent = '';
  t.mock.method(globalThis, 'fetch', async (url: string) => {sent = url;return Response.json(fixture);});
  await assert.rejects(getLunarGeometry(-89, 0, fixture.timeUTC, 1.25), /does not match/);
  assert.equal(new URL(sent,'http://localhost').searchParams.get('alt'), '1.25');
  for (const altitude of [NaN, Infinity, -20.001, 100.001]) {
    await assert.rejects(getLunarGeometry(-89,0,fixture.timeUTC,altitude), /Altitude/);
  }
});
test('client rejects unavailable payloads even if they contain plausible numbers', async (t) => {
  t.mock.method(globalThis,'fetch', async () => Response.json({...fixture,status:'UNAVAILABLE'}));
  await assert.rejects(getLunarGeometry(-89,0,fixture.timeUTC), /no valid scientific result/);
});
test('new provenance is validated while legacy metadata remains compatible', () => {
  const provenance = {provider:'JPL_HORIZONS',observationTimeUTC:fixture.timeUTC,producedAtUTC:'2026-10-26T00:00:00.000Z',
    frame:'HORIZONS_LUNAR_TOPOCENTRIC',centre:'coord@301',aberrationCorrection:'AIRLESS_APPARENT',
    method:'HORIZONS_OBSERVER_QUANTITY_4',cacheStatus:'MISS',limitations:['Reference horizon only.']};
  const valid = {...fixture,provenance,lunarSite:{...fixture.lunarSite,altitudeKm:1.25}};
  assert.equal(adaptLegacyHorizons(valid).provenance.producedAtUTC, provenance.producedAtUTC);
  assert.equal(adaptLegacyHorizons(valid).site.altitudeKm, 1.25);
  for (const patch of [{producedAtUTC:'bad'}, {centre:'399'}, {cacheStatus:'HIT'}, {aberrationCorrection:'NONE'}, {observationTimeUTC:'2026-10-11T00:00:00.000Z'}]) {
    assert.throws(() => parseLegacyHorizons({...valid,provenance:{...provenance,...patch}}));
  }
});
