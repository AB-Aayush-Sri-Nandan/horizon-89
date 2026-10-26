/** Scientific contracts. Display coordinates must never substitute for physical state. */
export type ScienceStatus = 'LIVE' | 'CACHED' | 'COMPUTED' | 'DERIVED' | 'UNAVAILABLE';
export type UTCString = string;
export interface ScienceProvenance {
  provider: string;
  sourceVersion?: string;
  model?: string;
  observationTimeUTC: UTCString;
  producedAtUTC: UTCString | null; // null when an older API provides no retrieval timestamp
  frame: string | null;
  centre: string | null;
  aberrationCorrection: string | null;
  kernelSetId?: string;
  datasetId?: string;
  method: string;
  cacheStatus: 'MISS' | 'HIT' | 'NOT_APPLICABLE' | 'UNKNOWN';
  limitations: readonly string[];
}
export interface ScienceError {
  status: 'UNAVAILABLE';
  code: 'VALIDATION_ERROR' | 'UPSTREAM_TIMEOUT' | 'UPSTREAM_UNAVAILABLE' |
    'UPSTREAM_PARSE_ERROR' | 'SCIENCE_STATE_UNAVAILABLE' | 'SCIENCE_SERVICE_UNAVAILABLE' | 'SCIENCE_KERNEL_MISSING' |
    'SCIENCE_KERNEL_MISMATCH' | 'KERNEL_COVERAGE_ERROR' | 'FRAME_TRANSFORM_ERROR' |
    'TERRAIN_DATA_UNAVAILABLE' | 'ASSET_UNAVAILABLE' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
  message: string;
  retryable: boolean;
  requestId?: string;
}
export interface HorizonMeasurement {
  azimuthDegrees: number;
  elevationDegrees: number;
  referenceHorizonAbove: boolean;
  terrainVisibilityEvaluated: false;
}
export interface LunarSite {
  latitudeDegrees: number;
  longitudeDegreesEast: number; // signed UI longitude, [-180, 180]
  altitudeKm: number | null;
  frame: string | null; // do not infer a frame from legacy coordinates
}
export interface MissionTime { utc: UTCString }
export interface ScientificVector {
  xyz: readonly [number, number, number];
  units: 'km' | 'km/s';
  frame: string;
  centre: string;
  epochUTC: UTCString;
  aberrationCorrection: string;
}
export interface CelestialBodyState {
  naifId: number;
  status: 'COMPUTED';
  position: ScientificVector;
  velocity: ScientificVector;
  orientation?: {
    bodyFixedFrame: string;
    quaternionInertialToBodyXYZW: readonly [number, number, number, number];
  };
  provenance: ScienceProvenance;
}
export interface DisplayBodyState {
  naifId: number;
  positionSceneUnits: readonly [number, number, number];
  radiusSceneUnits: number;
  transformId: string;
  distanceScale: 'PHYSICAL' | 'COMPRESSED';
  bodySize: 'PHYSICAL' | 'ENHANCED';
  physicalEpochUTC: UTCString;
}
/** Backward-compatible wire schema; reconstructed service adds optional provenance. */
export type HorizonBodyGeometry = {
  azimuthDegrees: number;
  elevationDegrees: number;
  geometricallyAboveHorizon: boolean;
  terrainVisibilityEvaluated: boolean;
  provenance?: ScienceProvenance;
};
export type SunGeometry = HorizonBodyGeometry & { surfaceIlluminationStatus: string };
export type EarthGeometry = HorizonBodyGeometry & { communicationStatus: string };
export type HorizonsGeometryResponse = {
  source: string;
  dataType: string;
  status: string;
  lunarSite: { latitude: number; longitude: number; altitudeKm?: number };
  provenance?: ScienceProvenance;
  requestId?: string;
  timeUTC: string;
  sun: SunGeometry;
  earth: EarthGeometry;
};
export interface HorizonAnalysis {
  status: 'LIVE' | 'CACHED' | 'UNAVAILABLE';
  site: LunarSite;
  time: MissionTime;
  sun: HorizonMeasurement;
  earth: HorizonMeasurement;
  provenance: ScienceProvenance;
}
