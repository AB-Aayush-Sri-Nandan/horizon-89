export type HorizonBodyGeometry = {
  azimuthDegrees: number;
  elevationDegrees: number;
  geometricallyAboveHorizon: boolean;
  terrainVisibilityEvaluated: boolean;
};

export type SunGeometry = HorizonBodyGeometry & {
  surfaceIlluminationStatus: string;
};

export type EarthGeometry = HorizonBodyGeometry & {
  communicationStatus: string;
};

export type HorizonsGeometryResponse = {
  source: string;
  dataType: string;
  status: string;

  lunarSite: {
    latitude: number;
    longitude: number;
  };

  timeUTC: string;

  sun: SunGeometry;
  earth: EarthGeometry;
};

export async function getLunarGeometry(
  latitude: number,
  longitude: number,
  timeUTC: string
): Promise<HorizonsGeometryResponse> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    time: timeUTC,
  });

  const response = await fetch(
    `/api/horizons?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "Could not retrieve NASA/JPL Horizons data"
    );
  }

  return data as HorizonsGeometryResponse;
}