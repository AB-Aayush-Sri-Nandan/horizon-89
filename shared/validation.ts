/** Input policy, not a claim of terrain clearance or physical site validity. */
export const MIN_ALTITUDE_KM = -20;
export const MAX_ALTITUDE_KM = 100;
export function validateSiteTime(latitude: number, longitude: number, utc: string): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Latitude must be −90…90° and longitude −180…180°.');
  }
  if (typeof utc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(utc) ||
      !Number.isFinite(Date.parse(utc)) || new Date(utc).toISOString() !== utc) {
    throw new Error('UTC must be a valid ISO timestamp with milliseconds and Z.');
  }
}
export function validateAltitude(altitudeKm: number): void {
  if (!Number.isFinite(altitudeKm) || altitudeKm < MIN_ALTITUDE_KM || altitudeKm > MAX_ALTITUDE_KM) {
    throw new Error(`Altitude must be ${MIN_ALTITUDE_KM}…${MAX_ALTITUDE_KM} km above the Horizons reference ellipsoid.`);
  }
}
