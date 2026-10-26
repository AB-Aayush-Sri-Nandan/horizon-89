import { validateAltitude } from '../../shared/validation.ts';
import { parseLegacyHorizons, validateSiteTime } from '../science/horizons.ts';
export type { HorizonBodyGeometry, SunGeometry, EarthGeometry, HorizonsGeometryResponse } from '../../shared/science.ts';
import type { HorizonsGeometryResponse } from '../../shared/science.ts';

export async function getLunarGeometry(
  latitude: number, longitude: number, timeUTC: string, altitudeKm = 0,
): Promise<HorizonsGeometryResponse> {
  validateSiteTime(latitude, longitude, timeUTC);
  validateAltitude(altitudeKm);
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), time: timeUTC, alt: String(altitudeKm) });
  let response: Response;
  try {
    response = await fetch(`/api/horizons?${params}`, { signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new Error('NASA/JPL Horizons request failed or timed out. No fallback geometry is shown.');
  }
  if (!response.ok) throw new Error('NASA/JPL Horizons is unavailable. No fallback geometry is shown.');
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error('Invalid Horizons JSON response.'); }
  const result = parseLegacyHorizons(data);
  if (result.status !== 'LIVE' && result.status !== 'CACHED') throw new Error('Horizons returned no valid scientific result.');
  if (result.lunarSite.latitude !== latitude || result.lunarSite.longitude !== longitude || result.timeUTC !== timeUTC ||
      (result.lunarSite.altitudeKm !== undefined && result.lunarSite.altitudeKm !== altitudeKm) ||
      (altitudeKm !== 0 && result.lunarSite.altitudeKm === undefined)) {
    throw new Error('Horizons response does not match the requested site and UTC.');
  }
  return result;
}
