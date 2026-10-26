import type { HorizonAnalysis, HorizonMeasurement, HorizonsGeometryResponse, ScienceProvenance } from '../../shared/science.ts';

export { validateSiteTime } from '../../shared/validation.ts';
import { validateSiteTime, validateAltitude } from '../../shared/validation.ts';

export function parseLegacyHorizons(value: unknown): HorizonsGeometryResponse {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid Horizons response.');
  const d = value as HorizonsGeometryResponse;
  if (typeof d.source !== 'string' || typeof d.status !== 'string' ||
      typeof d.dataType !== 'string' || !d.lunarSite) throw new Error('Invalid Horizons metadata.');
  validateSiteTime(d.lunarSite.latitude, d.lunarSite.longitude, d.timeUTC);
  if (d.lunarSite.altitudeKm !== undefined) validateAltitude(d.lunarSite.altitudeKm);
  for (const body of [d.sun, d.earth]) {
    if (!body || !Number.isFinite(body.azimuthDegrees) || body.azimuthDegrees < 0 ||
        body.azimuthDegrees >= 360 || !Number.isFinite(body.elevationDegrees) ||
        Math.abs(body.elevationDegrees) > 90 || typeof body.geometricallyAboveHorizon !== 'boolean' ||
        body.geometricallyAboveHorizon !== (body.elevationDegrees > 0) ||
        body.terrainVisibilityEvaluated !== false) throw new Error('Invalid reference-horizon measurement.');
  }
  const validProvenance = (p: ScienceProvenance) => {
    if (!p || p.provider !== 'JPL_HORIZONS' || p.observationTimeUTC !== d.timeUTC ||
        typeof p.producedAtUTC !== 'string' || p.frame !== 'HORIZONS_LUNAR_TOPOCENTRIC' ||
        p.centre !== 'coord@301' || p.aberrationCorrection !== 'AIRLESS_APPARENT' ||
        p.method !== 'HORIZONS_OBSERVER_QUANTITY_4' || !['MISS', 'HIT'].includes(p.cacheStatus) ||
        !Array.isArray(p.limitations) || !p.limitations.every(v => typeof v === 'string')) {
      throw new Error('Invalid Horizons provenance.');
    }
    validateSiteTime(0, 0, p.producedAtUTC);
  };
  if (d.provenance !== undefined) {
    validProvenance(d.provenance);
    if ((d.status === 'CACHED') !== (d.provenance.cacheStatus === 'HIT')) throw new Error('Inconsistent cache provenance.');
  }
  for (const body of [d.sun, d.earth]) if (body.provenance !== undefined) validProvenance(body.provenance);
  if (typeof d.sun.surfaceIlluminationStatus !== 'string' ||
      typeof d.earth.communicationStatus !== 'string') throw new Error('Invalid Horizons status fields.');
  return d;
}

/** No retrieval timestamp, frame or cache status is invented for the legacy API. */
export function adaptLegacyHorizons(value: HorizonsGeometryResponse): HorizonAnalysis {
  const d = parseLegacyHorizons(value);
  const measurement = (b: typeof d.sun | typeof d.earth): HorizonMeasurement => ({
    azimuthDegrees: b.azimuthDegrees, elevationDegrees: b.elevationDegrees,
    referenceHorizonAbove: b.elevationDegrees > 0, terrainVisibilityEvaluated: false,
  });
  return {
    status: d.status === 'LIVE' || d.status === 'CACHED' ? d.status : 'UNAVAILABLE',
    site: { latitudeDegrees: d.lunarSite.latitude, longitudeDegreesEast: d.lunarSite.longitude,
      altitudeKm: d.lunarSite.altitudeKm ?? null, frame: d.provenance?.frame ?? null },
    time: { utc: d.timeUTC }, sun: measurement(d.sun), earth: measurement(d.earth),
    provenance: d.provenance ?? {
      provider: d.source, observationTimeUTC: d.timeUTC, producedAtUTC: null,
      frame: null, centre: 'coord@301', aberrationCorrection: null,
      method: 'LEGACY_HORIZONS_RESPONSE_UNVERIFIED',
      cacheStatus: d.status === 'CACHED' ? 'HIT' : d.status === 'LIVE' ? 'MISS' : 'UNKNOWN',
      limitations: ['Legacy request conventions are not verified by this response.',
        'Altitude is not supplied by the legacy API.',
        'Retrieval time and frame are not supplied by the legacy API.',
        'Reference horizon only; no terrain, finite disc, eclipses or link budget.'],
    },
  };
}

export function formatAngle(value: number | null, signed = false): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  return `${signed ? value < 0 ? '−' : '+' : ''}${(signed ? Math.abs(value) : value).toFixed(3)}°`;
}
