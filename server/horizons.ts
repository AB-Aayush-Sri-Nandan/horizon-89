import type { HorizonsGeometryResponse, ScienceProvenance } from '../shared/science.ts';
import { validateSiteTime, validateAltitude } from '../shared/validation.ts';
import { ApiError } from './errors.ts';

export interface ObserverInput { latitude: number; longitude: number; altitudeKm: number; timeUTC: string }
export type Target = '10' | '399';
export const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';
export const CACHE_TTL_MS = 120_000;
const LIMITATIONS = ['Airless apparent target-centre direction; reference horizon only.',
  'Local terrain, finite target disc, eclipses, solar power and RF link budget are not evaluated.'];

export function normalizeEastLongitude(longitude: number): number {
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ApiError('VALIDATION_ERROR', 'Longitude must be −180…180° east.', 400);
  }
  return ((longitude % 360) + 360) % 360;
}
export function validateObserver(input: ObserverInput): void {
  try { validateSiteTime(input.latitude, input.longitude, input.timeUTC); validateAltitude(input.altitudeKm); }
  catch (e) { throw new ApiError('VALIDATION_ERROR', (e as Error).message, 400); }
}
export function parseObserverQuery(query: Record<string, unknown>): ObserverInput {
  const allowed = new Set(['lat', 'lon', 'alt', 'time']);
  if (Object.keys(query).some(k => !allowed.has(k))) throw new ApiError('VALIDATION_ERROR', 'Unknown query parameter.', 400);
  const number = (key: string, fallback?: number) => {
    if (query[key] === undefined && fallback !== undefined) return fallback;
    const raw = query[key];
    if (typeof raw !== 'string' || raw.length > 40 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
      throw new ApiError('VALIDATION_ERROR', `${key} must be a finite decimal number.`, 400);
    }
    return Number(raw);
  };
  if (typeof query.time !== 'string') throw new ApiError('VALIDATION_ERROR', 'time must be one UTC timestamp.', 400);
  const input = {latitude: number('lat'), longitude: number('lon'), altitudeKm: number('alt', 0), timeUTC: query.time};
  validateObserver(input);
  return input;
}
export function buildHorizonsURL(target: Target, input: ObserverInput): URL {
  validateObserver(input);
  const url = new URL(HORIZONS_URL);
  const quoted = (s: string) => `'${s}'`;
  const params: Record<string, string> = {
    format: 'json', COMMAND: quoted(target), OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'", CENTER: "'coord@301'", COORD_TYPE: "'GEODETIC'",
    SITE_COORD: quoted(`${normalizeEastLongitude(input.longitude)},${input.latitude},${input.altitudeKm}`),
    TLIST: quoted(input.timeUTC.replace('T', ' ').replace('Z', '')), TLIST_TYPE: "'CAL'",
    TIME_TYPE: "'UT'", CAL_TYPE: "'GREGORIAN'", TIME_DIGITS: "'FRACSEC'",
    QUANTITIES: "'4'", APPARENT: "'AIRLESS'", CSV_FORMAT: "'YES'", EXTRA_PREC: "'YES'",
  };
  url.search = new URLSearchParams(params).toString();
  return url;
}

/** Small CSV reader: supports quoted fields and doubled quotes, rejects malformed quoting. */
export function parseCSV(line: string): string[] {
  const fields: string[] = []; let field = ''; let quoted = false; let closed = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',') { fields.push(field.trim()); field = ''; closed = false; }
    else if (c === '"') {
      if (field.trim() || closed) throw new Error('Invalid CSV quoting.');
      quoted = true;
    } else {
      if (closed && c.trim()) throw new Error('Invalid text after quoted CSV field.');
      field += c;
    }
  }
  if (quoted) throw new Error('Unterminated CSV field.');
  fields.push(field.trim()); return fields;
}
function epochFromCalendar(value: string): string {
  const match = /^(?:A\.D\.\s+)?(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/.exec(value);
  if (!match) throw new Error('Unsupported observer calendar epoch.');
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    .findIndex(m => m.toLowerCase() === match[2].toLowerCase()) + 1;
  if (!month || /[1-9]/.test((match[7] || '').slice(3))) throw new Error('Unsupported epoch precision.');
  const utc = `${match[1]}-${String(month).padStart(2, '0')}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${(match[7] || '').padEnd(3, '0').slice(0, 3)}Z`;
  validateSiteTime(0, 0, utc); return utc;
}
export function parseHorizonsResult(text: string, target: Target, requestedUTC: string): {azimuthDegrees: number; elevationDegrees: number} {
  try {
    if (!/^Atmos refraction:\s*NO\s+\(AIRLESS\)/m.test(text)) throw new Error('Airless table required.');
    const targetLine = text.match(/^Target body name:\s*(.+)$/m)?.[1];
    if (!targetLine || !new RegExp(`\\(${target}\\)(?:\\s|$)`).test(targetLine)) throw new Error('Target identity mismatch.');
    if (!/^Center body name:\s*Moon\s+\(301\)(?:\s|$)/m.test(text)) throw new Error('Observer body mismatch.');
    if (text.split('$$SOE').length !== 2 || text.split('$$EOE').length !== 2) throw new Error('Invalid ephemeris markers.');
    const start = text.indexOf('$$SOE'); const end = text.indexOf('$$EOE');
    if (end <= start) throw new Error('Reversed ephemeris markers.');
    const headers = text.slice(0, start).split(/\r?\n/).filter(l => /Date__/.test(l) && /Azi/.test(l) && /Elev/.test(l));
    if (headers.length !== 1) throw new Error('Missing or ambiguous AZ/EL header.');
    const columns = parseCSV(headers[0]);
    const az = columns.findIndex(c => /^Azi.*\(a-app\)/.test(c));
    const el = columns.findIndex(c => /^Elev.*\(a-app\)/.test(c));
    const date = columns.findIndex(c => /^Date__\(UT\)/.test(c));
    if (az < 0 || el < 0 || date < 0) throw new Error('Airless apparent UTC columns required.');
    const rows = text.slice(start + 5, end).split(/\r?\n/).filter(l => l.trim());
    if (rows.length !== 1) throw new Error('Exactly one observer epoch required.');
    const row = parseCSV(rows[0]);
    if (row.length !== columns.length || epochFromCalendar(row[date]) !== requestedUTC) throw new Error('Observer epoch/column mismatch.');
    const decimal = /^[+-]?\d+(?:\.\d+)?$/;
    if (!decimal.test(row[az]) || !decimal.test(row[el])) throw new Error('Non-numeric observer data.');
    const azimuthDegrees = Number(row[az]); const elevationDegrees = Number(row[el]);
    if (!Number.isFinite(azimuthDegrees) || azimuthDegrees < 0 || azimuthDegrees >= 360 ||
        !Number.isFinite(elevationDegrees) || Math.abs(elevationDegrees) > 90) throw new Error('Out-of-range observer angles.');
    return {azimuthDegrees, elevationDegrees};
  } catch (e) {
    throw new ApiError('UPSTREAM_PARSE_ERROR', 'JPL Horizons response could not be validated.', 502, true, (e as Error).message);
  }
}

interface Measurement { azimuthDegrees: number; elevationDegrees: number; provenance: ScienceProvenance }
interface CacheEntry { value: Measurement; expiresAt: number }
export interface ServiceOptions {
  fetchImpl?: typeof fetch; now?: () => number; timeoutMs?: number; maxResponseBytes?: number;
  cacheTtlMs?: number; maxCacheEntries?: number; maxConcurrent?: number;
}
export class HorizonsService {
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<Measurement>>();
  private fetchImpl: typeof fetch; private now: () => number;
  private timeoutMs: number; private maxBytes: number; private ttl: number; private maxEntries: number; private maxConcurrent: number;
  constructor(options: ServiceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch; this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? 10_000; this.maxBytes = options.maxResponseBytes ?? 1_000_000;
    this.ttl = options.cacheTtlMs ?? CACHE_TTL_MS; this.maxEntries = options.maxCacheEntries ?? 256;
    this.maxConcurrent = options.maxConcurrent ?? 16;
  }
  private async retrieve(target: Target, input: ObserverInput): Promise<Measurement> {
    const signal = AbortSignal.timeout(this.timeoutMs);
    try {
      const response = await this.fetchImpl(buildHorizonsURL(target, input), {signal, redirect: 'error', headers: {accept: 'application/json'}});
      if (!response.ok) throw new ApiError('UPSTREAM_UNAVAILABLE', 'JPL Horizons returned an unsuccessful HTTP response.', 502, true, `HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > this.maxBytes) {
        await response.body?.cancel(); throw new ApiError('UPSTREAM_PARSE_ERROR', 'JPL Horizons response exceeds the size limit.', 502, true);
      }
      if (!response.body) throw new ApiError('UPSTREAM_PARSE_ERROR', 'Empty JPL Horizons response.', 502, true);
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) {
          const {done, value} = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > this.maxBytes) { await reader.cancel(); throw new ApiError('UPSTREAM_PARSE_ERROR', 'JPL Horizons response exceeds the size limit.', 502, true); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      let data: {error?: unknown; result?: unknown; signature?: {version?: unknown}};
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new ApiError('UPSTREAM_PARSE_ERROR', 'JPL Horizons returned invalid JSON.', 502, true); }
      if (!data || typeof data !== 'object') throw new ApiError('UPSTREAM_PARSE_ERROR', 'Invalid JPL Horizons response.', 502, true);
      if (data.error) throw new ApiError('UPSTREAM_UNAVAILABLE', 'JPL Horizons reported an upstream error.', 502, true,
        Array.from(String(data.error).slice(0, 1000), char => { const code = char.charCodeAt(0); return code < 32 || code === 127 ? ' ' : char; }).join(''));
      if (typeof data.result !== 'string') throw new ApiError('UPSTREAM_PARSE_ERROR', 'Missing JPL Horizons observer table.', 502, true);
      const angles = parseHorizonsResult(data.result, target, input.timeUTC);
      return {...angles, provenance: {
        provider: 'JPL_HORIZONS', sourceVersion: typeof data.signature?.version === 'string' ? data.signature.version : undefined,
        observationTimeUTC: input.timeUTC, producedAtUTC: new Date(this.now()).toISOString(),
        frame: 'HORIZONS_LUNAR_TOPOCENTRIC', centre: 'coord@301', aberrationCorrection: 'AIRLESS_APPARENT',
        method: 'HORIZONS_OBSERVER_QUANTITY_4', cacheStatus: 'MISS', limitations: LIMITATIONS,
      }};
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (signal.aborted) throw new ApiError('UPSTREAM_TIMEOUT', 'JPL Horizons request timed out.', 504, true);
      throw new ApiError('UPSTREAM_UNAVAILABLE', 'JPL Horizons could not be reached.', 502, true);
    }
  }
  private async measurement(target: Target, input: ObserverInput): Promise<Measurement> {
    const key = JSON.stringify([target, input.latitude, normalizeEastLongitude(input.longitude), input.altitudeKm, input.timeUTC]);
    const now = this.now();
    for (const [k, entry] of this.cache) if (entry.expiresAt <= now) this.cache.delete(k);
    const cached = this.cache.get(key);
    if (cached) return {...cached.value, provenance: {...cached.value.provenance, cacheStatus: 'HIT'}};
    const existing = this.pending.get(key);
    if (existing) return existing; // A coalesced fresh retrieval is LIVE, not a cache hit.
    if (this.pending.size >= this.maxConcurrent) throw new ApiError('RATE_LIMITED', 'Too many concurrent science requests.', 429, true);
    const promise = this.retrieve(target, input).then(value => {
      if (this.cache.size >= this.maxEntries) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, {value, expiresAt: this.now() + this.ttl}); return value;
    });
    this.pending.set(key, promise);
    try { return await promise; } finally { this.pending.delete(key); }
  }
  async geometry(input: ObserverInput): Promise<HorizonsGeometryResponse> {
    validateObserver(input);
    const [sun, earth] = await Promise.all([this.measurement('10', input), this.measurement('399', input)]);
    const cached = sun.provenance.cacheStatus === 'HIT' && earth.provenance.cacheStatus === 'HIT';
    const producedAtUTC = [sun.provenance.producedAtUTC!, earth.provenance.producedAtUTC!].sort().at(-1)!;
    return {
      source: 'JPL Horizons', dataType: 'AIRLESS_APPARENT_AZ_EL', status: cached ? 'CACHED' : 'LIVE',
      lunarSite: {latitude: input.latitude, longitude: input.longitude, altitudeKm: input.altitudeKm}, timeUTC: input.timeUTC,
      provenance: {...sun.provenance, producedAtUTC, cacheStatus: cached ? 'HIT' : 'MISS'},
      sun: {...sun, geometricallyAboveHorizon: sun.elevationDegrees > 0, terrainVisibilityEvaluated: false,
        surfaceIlluminationStatus: 'REFERENCE_HORIZON_ONLY'},
      earth: {...earth, geometricallyAboveHorizon: earth.elevationDegrees > 0, terrainVisibilityEvaluated: false,
        communicationStatus: 'REFERENCE_HORIZON_ONLY'},
    };
  }
}
