import type { HorizonAnalysis, HorizonMeasurement, HorizonsGeometryResponse } from '../../shared/science.ts';

export function validateSiteTime(latitude: number, longitude: number, utc: string): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Latitude must be −90…90° and longitude −180…180°.');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(utc) ||
      !Number.isFinite(Date.parse(utc)) || new Date(utc).toISOString() !== utc) {
    throw new Error('UTC must be a valid ISO timestamp with milliseconds and Z.');
  }
}

export function parseLegacyHorizons(value: unknown): HorizonsGeometryResponse {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid Horizons response.');
  const d = value as HorizonsGeometryResponse;
  if (typeof d.source !== 'string' || typeof d.status !== 'string' ||
      typeof d.dataType !== 'string' || !d.lunarSite) throw new Error('Invalid Horizons metadata.');
  validateSiteTime(d.lunarSite.latitude, d.lunarSite.longitude, d.timeUTC);
  for (const body of [d.sun, d.earth]) {
    if (!body || !Number.isFinite(body.azimuthDegrees) || body.azimuthDegrees < 0 ||
        body.azimuthDegrees >= 360 || !Number.isFinite(body.elevationDegrees) ||
        Math.abs(body.elevationDegrees) > 90 || typeof body.geometricallyAboveHorizon !== 'boolean' ||
        body.geometricallyAboveHorizon !== (body.elevationDegrees > 0) ||
        body.terrainVisibilityEvaluated !== false) throw new Error('Invalid reference-horizon measurement.');
  }
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
      altitudeKm: null, frame: null },
    time: { utc: d.timeUTC }, sun: measurement(d.sun), earth: measurement(d.earth),
    provenance: {
      provider: d.source, observationTimeUTC: d.timeUTC, producedAtUTC: null,
      frame: null, centre: 'coord@301', aberrationCorrection: null,
      method: 'LEGACY_HORIZONS_RESPONSE_UNVERIFIED',
      cacheStatus: d.status === 'CACHED' ? 'HIT' : d.status === 'LIVE' ? 'MISS' : 'UNKNOWN',
      limitations: ['Backend implementation absent: request conventions are not verified.',
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
