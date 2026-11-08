/** PDS3 detached single-band DEM support. No photographic inputs or inferred metadata. */
export interface DEMMetadata {
  productId: string;
  target: "MOON";
  projection: "EQUIRECTANGULAR" | "POLAR_STEREOGRAPHIC";
  width: number;
  height: number;
  sampleBits: 16 | 32;
  sampleType: "LSB_INTEGER" | "MSB_INTEGER" | "PC_REAL" | "IEEE_REAL";
  scale: number;
  offset: number;
  noData: number;
  unit: "m";
  radiusM: number;
  mapScaleM: number;
  centerLatitude: number;
  centerLongitude: number;
  lineOffset: number;
  sampleOffset: number;
  longitudeDirection: "EAST";
  latitudeType: "PLANETOCENTRIC";
  epoch: string;
}
export interface TerrainTile {
  version: 1;
  metadata: DEMMetadata;
  source: {
    url: string;
    labelUrl: string;
    retrievedAt: string;
    processedAt?: string;
    labelSha256: string;
    imageSha256: string;
    integrity: "publisher-sha256" | "local-sha256-only";
    attribution: string;
    license: string;
    verticalDatum: string;
  };
  bounds: { north: number; south: number; west: number; east: number };
  width: number;
  height: number;
  elevations: (number | null)[];
  slopes: (number | null)[];
  sampling: "nearest source pixel";
  slopeMethod: string;
}
export function parsePDS3(label: string): DEMMetadata {
  const clean = label.replace(/\/\*[\s\S]*?\*\//g, "");
  const fields = new Map<string, string>();
  const stack: string[] = [];
  for (const line of clean.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w^]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/^"(.*)"$/, "$1");
    if (key === "OBJECT" || key === "GROUP") stack.push(value);
    else if (key === "END_OBJECT" || key === "END_GROUP") {
      if (stack.pop() !== value)
        throw new Error("Unbalanced PDS metadata groups");
    } else {
      const path = [...stack, key].join(".");
      if (fields.has(path)) throw new Error(`Duplicate PDS field: ${path}`);
      fields.set(path, value);
    }
  }
  function get(key: string, group?: string) {
    const matches = [...fields]
      .filter(([name]) => name === key || name.endsWith("." + key))
      .filter(([name]) => !group || name.startsWith(group + "."));
    if (matches.length !== 1)
      throw new Error(`Missing or ambiguous PDS field: ${key}`);
    return matches[0][1];
  }
  function num(key: string, group?: string) {
    const value = get(key, group);
    if (!/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?(?:\s*<[^>]+>)?$/.test(value))
      throw new Error(`Unsupported numeric PDS field: ${key}`);
    const n = Number(value.split(/\s/)[0]);
    if (!Number.isFinite(n)) throw new Error(`Invalid ${key}`);
    return n;
  }
  function meters(key: string, group?: string) {
    const raw = get(key, group);
    const unit = raw.match(/<([^>]+)>/)?.[1].toUpperCase();
    if (!unit) throw new Error(`Explicit length units required: ${key}`);
    if (["M", "METER", "METERS", "M/PIXEL", "METERS/PIXEL"].includes(unit))
      return num(key, group);
    if (
      [
        "KM",
        "KILOMETER",
        "KILOMETERS",
        "KM/PIXEL",
        "KILOMETERS/PIXEL",
      ].includes(unit)
    )
      return num(key, group) * 1000;
    throw new Error(`Unsupported length units: ${unit}`);
  }
  if (get("PDS_VERSION_ID") !== "PDS3" || get("TARGET_NAME") !== "MOON")
    throw new Error("Only explicit PDS3 lunar DEMs are supported");
  if (
    get("POSITIVE_LONGITUDE_DIRECTION") !== "EAST" ||
    get("COORDINATE_SYSTEM_NAME") !== "PLANETOCENTRIC"
  )
    throw new Error(
      "Only east-positive, planetocentric coordinates are supported",
    );
  const projection = get("MAP_PROJECTION_TYPE");
  const centerLatitude = num("CENTER_LATITUDE");
  if (
    !["SIMPLE CYLINDRICAL", "EQUIRECTANGULAR", "POLAR STEREOGRAPHIC"].includes(
      projection,
    )
  )
    throw new Error("Unsupported projection");
  if (projection === "POLAR STEREOGRAPHIC" && Math.abs(centerLatitude) !== 90)
    throw new Error("Polar stereographic must be centered on a pole");
  if (projection !== "POLAR STEREOGRAPHIC" && centerLatitude !== 0)
    throw new Error("Only equatorial equirectangular projection supported");
  const radiusM = meters("A_AXIS_RADIUS");
  if (
    Math.abs(radiusM - meters("B_AXIS_RADIUS")) > 0.001 ||
    Math.abs(radiusM - meters("C_AXIS_RADIUS")) > 0.001
  )
    throw new Error("Only spherical lunar reference bodies supported");
  const sampleBits = num("SAMPLE_BITS", "IMAGE"),
    sampleType = get("SAMPLE_TYPE", "IMAGE");
  if (!(
    (sampleBits === 16 &&
      ["LSB_INTEGER", "MSB_INTEGER"].includes(sampleType)) ||
    (sampleBits === 32 && ["PC_REAL", "IEEE_REAL"].includes(sampleType))
  ))
    throw new Error(
      "Unsupported sample encoding (requires signed int16 or float32)",
    );
  const unit = get("UNIT", "IMAGE").toUpperCase();
  if (!["M", "METER", "METERS"].includes(unit))
    throw new Error("DEM height UNIT must explicitly be metres");
  const width = num("LINE_SAMPLES", "IMAGE"),
    height = num("LINES", "IMAGE");
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    width > 100000 ||
    height > 100000
  )
    throw new Error("Invalid raster dimensions");
  const metadata: DEMMetadata = {
    productId: get("PRODUCT_ID"),
    target: "MOON",
    projection:
      projection === "POLAR STEREOGRAPHIC"
        ? "POLAR_STEREOGRAPHIC"
        : "EQUIRECTANGULAR",
    width,
    height,
    sampleBits: sampleBits as 16 | 32,
    sampleType: sampleType as DEMMetadata["sampleType"],
    scale: num("SCALING_FACTOR", "IMAGE"),
    offset: num("OFFSET", "IMAGE"),
    noData: num("MISSING_CONSTANT", "IMAGE"),
    unit: "m",
    radiusM,
    mapScaleM: meters("MAP_SCALE"),
    centerLatitude,
    centerLongitude: num("CENTER_LONGITUDE"),
    lineOffset: num("LINE_PROJECTION_OFFSET"),
    sampleOffset: num("SAMPLE_PROJECTION_OFFSET"),
    longitudeDirection: "EAST",
    latitudeType: "PLANETOCENTRIC",
    epoch: get("PRODUCT_CREATION_TIME"),
  };
  if (
    metadata.mapScaleM <= 0 ||
    metadata.radiusM < 1700000 ||
    metadata.radiusM > 1800000 ||
    metadata.scale <= 0
  )
    throw new Error("Invalid lunar scale/radius");
  if (!Number.isFinite(Date.parse(metadata.epoch)))
    throw new Error("Product processing epoch is required");
  for (const optional of ["BANDS", "LINE_PREFIX_BYTES", "LINE_SUFFIX_BYTES"]) {
    const val = [...fields].find(([k]) => k === "IMAGE." + optional)?.[1];
    if (val !== undefined && Number(val) !== (optional === "BANDS" ? 1 : 0))
      throw new Error("Multi-band or padded rasters are unsupported");
  }
  return metadata;
}
/** PDS: x=(sample-offset-1)*scale, y=(lineOffset-line+1)*scale, with 1-based sample/line. Return zero-based indices. */
export function geographicToPixel(
  meta: DEMMetadata,
  lat: number,
  lon: number,
): [number, number] | null {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    return null;
  const radians = Math.PI / 180,
    dlon = (((lon - meta.centerLongitude + 540) % 360) - 180) * radians;
  let x: number, y: number;
  if (meta.projection === "EQUIRECTANGULAR") {
    x = meta.radiusM * dlon;
    y = meta.radiusM * lat * radians;
  } else {
    const sign = Math.sign(meta.centerLatitude);
    if (lat * sign <= 0) return null;
    const rho =
      2 * meta.radiusM * Math.tan(Math.PI / 4 - (sign * lat * radians) / 2);
    x = rho * Math.sin(dlon);
    y = -sign * rho * Math.cos(dlon);
  }
  let column = meta.sampleOffset + x / meta.mapScaleM;
  const row = meta.lineOffset - y / meta.mapScaleM;
  // Only global cylindrical products wrap. Regional projected rasters never wrap.
  if (
    meta.projection === "EQUIRECTANGULAR" &&
    Math.abs(meta.width * meta.mapScaleM - 2 * Math.PI * meta.radiusM) <
      2 * meta.mapScaleM
  )
    column = ((column % meta.width) + meta.width) % meta.width;
  return column < -0.5 ||
    column > meta.width - 0.5 ||
    row < -0.5 ||
    row > meta.height - 0.5
    ? null
    : [column, row];
}
export function pixelToGeographic(
  meta: DEMMetadata,
  column: number,
  row: number,
): [number, number] {
  const x = (column - meta.sampleOffset) * meta.mapScaleM,
    y = (meta.lineOffset - row) * meta.mapScaleM;
  let latitude: number, longitude: number;
  if (meta.projection === "EQUIRECTANGULAR") {
    latitude = ((y / meta.radiusM) * 180) / Math.PI;
    longitude = meta.centerLongitude + ((x / meta.radiusM) * 180) / Math.PI;
  } else {
    const sign = Math.sign(meta.centerLatitude),
      rho = Math.hypot(x, y);
    latitude =
      sign * (90 - (2 * Math.atan(rho / (2 * meta.radiusM)) * 180) / Math.PI);
    longitude =
      meta.centerLongitude + (Math.atan2(x, -sign * y) * 180) / Math.PI;
  }
  return [latitude, ((longitude + 540) % 360) - 180];
}
export function decodeElevation(
  view: DataView,
  offset: number,
  meta: DEMMetadata,
): number | null {
  const raw =
    meta.sampleBits === 16
      ? view.getInt16(offset, meta.sampleType === "LSB_INTEGER")
      : view.getFloat32(offset, meta.sampleType === "PC_REAL");
  if (!Number.isFinite(raw) || raw === meta.noData) return null;
  const meters = raw * meta.scale + meta.offset;
  return Number.isFinite(meters) ? meters : null;
}
/** Central differences on original projected DEM samples, not a resampled thumbnail. */
export function slopeDegrees(
  w: number | null,
  e: number | null,
  n: number | null,
  s: number | null,
  groundSpacingM: number,
): number | null {
  if (
    [w, e, n, s].some((v) => v === null || !Number.isFinite(v)) ||
    !Number.isFinite(groundSpacingM) ||
    groundSpacingM <= 0
  )
    return null;
  return (
    (Math.atan(
      Math.hypot(
        (e! - w!) / (2 * groundSpacingM),
        (n! - s!) / (2 * groundSpacingM),
      ),
    ) *
      180) /
    Math.PI
  );
}
export function groundSpacing(
  meta: DEMMetadata,
  latitude: number,
): number | null {
  if (meta.projection !== "POLAR_STEREOGRAPHIC") return null; // Cylindrical anisotropy is deliberately not approximated.
  const factor = 2 / (1 + Math.sin((Math.abs(latitude) * Math.PI) / 180));
  return meta.mapScaleM / factor;
}
export function sampleTerrain(
  tile: TerrainTile,
  latitude: number,
  longitude: number,
) {
  const { bounds, width, height } = tile;
  if (
    latitude > bounds.north ||
    latitude < bounds.south ||
    longitude < bounds.west ||
    longitude > bounds.east
  )
    return null;
  const x = Math.round(
      ((longitude - bounds.west) / (bounds.east - bounds.west)) * (width - 1),
    ),
    y = Math.round(
      ((bounds.north - latitude) / (bounds.north - bounds.south)) *
        (height - 1),
    ),
    index = y * width + x;
  const elevation = tile.elevations[index];
  if (elevation === null || !Number.isFinite(elevation)) return null;
  return {
    elevationM: elevation,
    slopeDegrees: tile.slopes[index] ?? null,
    latitude: bounds.north - (y / (height - 1)) * (bounds.north - bounds.south),
    longitude: bounds.west + (x / (width - 1)) * (bounds.east - bounds.west),
  };
}
export function validateTerrainTile(value: unknown): TerrainTile {
  const t = value as TerrainTile;
  if (
    !t ||
    t.version !== 1 ||
    !Number.isInteger(t.width) ||
    !Number.isInteger(t.height) ||
    t.width < 2 ||
    t.height < 2 ||
    t.width > 361 ||
    t.height > 181
  )
    throw new Error("Invalid or oversized terrain tile");
  if (
    !t.metadata ||
    t.metadata.target !== "MOON" ||
    t.metadata.unit !== "m" ||
    !t.metadata.productId ||
    !Number.isFinite(t.metadata.mapScaleM) ||
    t.metadata.mapScaleM <= 0
  )
    throw new Error("Missing scientific DEM metadata");
  if (
    !["EQUIRECTANGULAR", "POLAR_STEREOGRAPHIC"].includes(
      t.metadata.projection,
    ) ||
    t.metadata.longitudeDirection !== "EAST" ||
    t.metadata.latitudeType !== "PLANETOCENTRIC" ||
    !Number.isFinite(t.metadata.radiusM) ||
    t.metadata.radiusM < 1700000 ||
    t.metadata.radiusM > 1800000 ||
    !Number.isFinite(t.metadata.scale) ||
    t.metadata.scale <= 0 ||
    !Number.isFinite(t.metadata.offset) ||
    !Number.isFinite(t.metadata.noData) ||
    !Number.isFinite(Date.parse(t.metadata.epoch))
  )
    throw new Error("Unsupported terrain reference metadata");
  if (
    !t.bounds ||
    ![t.bounds.north, t.bounds.south, t.bounds.west, t.bounds.east].every(
      Number.isFinite,
    ) ||
    t.bounds.north > 90 ||
    t.bounds.south < -90 ||
    t.bounds.north <= t.bounds.south ||
    t.bounds.west < -180 ||
    t.bounds.east > 180 ||
    t.bounds.west >= t.bounds.east
  )
    throw new Error("Invalid tile bounds");
  for (const key of ["elevations", "slopes"] as const)
    if (
      !Array.isArray(t[key]) ||
      t[key].length !== t.width * t.height ||
      t[key].some(
        (v) =>
          v !== null &&
          (!Number.isFinite(v) || (key === "slopes" && (v < 0 || v > 90))),
      )
    )
      throw new Error("Invalid terrain values");
  if (
    !t.source ||
    !/^https:\/\//.test(t.source.url) ||
    !/^https:\/\//.test(t.source.labelUrl) ||
    ![t.source.imageSha256, t.source.labelSha256].every((h) =>
      /^[a-f0-9]{64}$/.test(h),
    ) ||
    !["publisher-sha256", "local-sha256-only"].includes(t.source.integrity) ||
    (t.source.processedAt !== undefined &&
      !Number.isFinite(Date.parse(t.source.processedAt))) ||
    !t.source.license ||
    !t.source.verticalDatum ||
    !t.source.attribution ||
    !Number.isFinite(Date.parse(t.source.retrievedAt))
  )
    throw new Error("Missing terrain provenance");
  return t;
}
