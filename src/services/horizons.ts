import type { Coordinates } from "../data/catalog";
export interface HorizonBodyGeometry {
  returnedTimeUTC?: string;
  azimuthDegrees: number;
  elevationDegrees: number;
  geometricallyAboveHorizon: boolean;
  terrainVisibilityEvaluated: false;
}
export interface HorizonsGeometryResponse {
  source: string;
  sourceUrl: string;
  dataType: "calculated";
  status: string;
  lunarSite: Coordinates;
  timeUTC: string;
  fetchedAt: string;
  cached: boolean;
  frame: string;
  sun: HorizonBodyGeometry;
  earth: HorizonBodyGeometry;
}
export async function requestJSON<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(25000),
  });
  const body = await response.json().catch(() => ({
    error:
      "Service returned a non-JSON response. Check that the backend is running.",
  }));
  if (!response.ok)
    throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}
export function getLunarGeometry(
  latitude: number,
  longitude: number,
  timeUTC: string,
  signal?: AbortSignal,
) {
  return requestJSON<HorizonsGeometryResponse>(
    `/api/horizons?${new URLSearchParams({ lat: String(latitude), lon: String(longitude), time: timeUTC })}`,
    { signal },
  );
}
