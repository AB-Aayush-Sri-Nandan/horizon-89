import type { Coordinates } from "../data/catalog";
/** East-positive longitude, +Y north; agrees with SphereGeometry equirectangular UVs. */
export function surfaceVector(
  { latitude, longitude }: Coordinates,
  radius = 1,
): [number, number, number] {
  const lat = (latitude * Math.PI) / 180,
    lon = (longitude * Math.PI) / 180;
  return [
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon),
  ];
}
export function validCoordinates(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}
export function formatCoordinates(site: Coordinates | null) {
  return site
    ? `${Math.abs(site.latitude).toFixed(3)}°${site.latitude < 0 ? "S" : "N"} / ${Math.abs(site.longitude).toFixed(3)}°${site.longitude < 0 ? "W" : "E"}`
    : "Coordinates unverified";
}
export function utcDay(date: string, minutes: number) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
    !Number.isFinite(minutes)
  )
    throw new Error("Invalid UTC date");
  if (new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date)
    throw new Error("Invalid UTC calendar date");
  return new Date(
    Date.parse(date + "T00:00:00Z") +
      Math.max(0, Math.min(1439, minutes)) * 60000,
  ).toISOString();
}
export function advanceMinutes(
  current: number,
  speed: number,
  seconds: number,
) {
  return Math.min(1439, current + (speed * seconds) / 60);
}
