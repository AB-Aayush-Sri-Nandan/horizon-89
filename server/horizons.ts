export class ServiceError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 502, code = "INVALID_DATA") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function validateQuery(params: URLSearchParams) {
  const rawLat = params.get("lat"),
    rawLon = params.get("lon"),
    time = params.get("time");
  const lat = Number(rawLat),
    lon = Number(rawLon);
  if (
    !rawLat?.trim() ||
    !rawLon?.trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new ServiceError(
      "Latitude must be −90…90 and east-positive longitude −180…180.",
      400,
    );
  if (
    !time ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(time) ||
    !Number.isFinite(Date.parse(time))
  )
    throw new ServiceError(
      "Time must be an ISO 8601 UTC timestamp ending in Z.",
      400,
    );
  const date = new Date(time);
  if (date.getUTCFullYear() < 1962 || date.getUTCFullYear() > 2100)
    throw new ServiceError(
      "Supported dates are 1962–2100 UTC. Earlier Horizons UT dates may use UT1 and are not accepted as UTC.",
      400,
    );
  if (date.toISOString().slice(0, 10) !== time.slice(0, 10))
    throw new ServiceError("Invalid calendar date.", 400);
  return { latitude: lat, longitude: lon, timeUTC: date.toISOString() };
}
export function parseHorizons(text: string, expectedTimeUTC?: string) {
  if (!text.includes("$$SOE"))
    throw new ServiceError(
      "JPL did not return an observer table. Check observer parameters or upstream availability.",
      502,
      "UPSTREAM_ERROR",
    );
  if (!text.includes("$$EOE"))
    throw new ServiceError("Horizons result has no end-of-ephemeris marker.");
  const azNames = ["Azi_(a-app)", "Azimuth_(a-app)"],
    elNames = ["Elev_(a-app)", "Elevation_(a-app)"];
  const split = (line: string) =>
    line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  const section = text.split("$$SOE")[1]?.split("$$EOE")[0];
  const header = text
    .split("$$SOE")[0]
    ?.split("\n")
    .findLast(
      (line) =>
        split(line).some((v) => azNames.includes(v)) &&
        split(line).some((v) => elNames.includes(v)),
    );
  if (!section || !header)
    throw new ServiceError(
      "Horizons did not supply supported airless azimuth/elevation columns. Expected quantity 4 observer output.",
      502,
      "UNSUPPORTED_TABLE",
    );
  const headings = split(header);
  if (
    headings.filter((v) => azNames.includes(v)).length !== 1 ||
    headings.filter((v) => elNames.includes(v)).length !== 1
  )
    throw new ServiceError(
      "Ambiguous observer geometry columns.",
      502,
      "UNSUPPORTED_TABLE",
    );
  const row = section
    .trim()
    .split("\n")[0]
    ?.split(",")
    .map((v) => v.trim().replace(/^"|"$/g, ""));
  const az = row?.[headings.findIndex((v) => azNames.includes(v))];
  const el = row?.[headings.findIndex((v) => elNames.includes(v))];
  if (!az || !el)
    throw new ServiceError("Horizons returned incomplete observer geometry.");
  const azimuthDegrees = Number(az),
    elevationDegrees = Number(el);
  if (
    !Number.isFinite(azimuthDegrees) ||
    !Number.isFinite(elevationDegrees) ||
    azimuthDegrees < 0 ||
    azimuthDegrees > 360 ||
    Math.abs(elevationDegrees) > 90
  )
    throw new ServiceError(
      "Horizons returned unavailable or invalid observer geometry.",
    );
  let returnedTimeUTC: string | undefined;
  if (expectedTimeUTC) {
    const calendar = row?.[0]
      ?.replace(/^A\.D\.\s*/, "")
      .match(
        /^(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/,
      );
    if (!calendar)
      throw new ServiceError("Unsupported Horizons returned timestamp.");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months.findIndex(
      (m) => m.toLowerCase() === calendar[2].toLowerCase(),
    );
    if (month < 0) throw new ServiceError("Invalid Horizons calendar month.");
    returnedTimeUTC = `${calendar[1]}-${String(month + 1).padStart(2, "0")}-${calendar[3]}T${calendar[4]}:${calendar[5]}:${calendar[6] ?? "00"}.${(calendar[7] ?? "").padEnd(3, "0").slice(0, 3)}Z`;
    if (
      !Number.isFinite(Date.parse(returnedTimeUTC)) ||
      Math.abs(Date.parse(returnedTimeUTC) - Date.parse(expectedTimeUTC)) > 1
    )
      throw new ServiceError(
        "Horizons returned a different UTC instant; result rejected.",
      );
  }
  return {
    ...(returnedTimeUTC ? { returnedTimeUTC } : {}),
    azimuthDegrees,
    elevationDegrees,
    geometricallyAboveHorizon: elevationDegrees > 0,
    terrainVisibilityEvaluated: false as const,
  };
}
export function horizonsURL(
  body: "10" | "399",
  site: ReturnType<typeof validateQuery>,
) {
  const start = site.timeUTC.replace("T", " ").replace("Z", "");
  const stop = new Date(Date.parse(site.timeUTC) + 60000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
  const values: Record<string, string> = {
    format: "json",
    COMMAND: body,
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "OBSERVER",
    CENTER: "coord@301",
    COORD_TYPE: "GEODETIC",
    SITE_COORD: `${site.longitude},${site.latitude},0`,
    START_TIME: start,
    STOP_TIME: stop,
    STEP_SIZE: "1 m",
    QUANTITIES: "4",
    CSV_FORMAT: "YES",
    ANG_FORMAT: "DEG",
    APPARENT: "AIRLESS",
    EXTRA_PREC: "YES",
    OBJ_DATA: "NO",
    TIME_TYPE: "UT",
    TIME_DIGITS: "FRACSEC",
    CAL_FORMAT: "CAL",
  };
  return (
    "https://ssd.jpl.nasa.gov/api/horizons.api?" +
    new URLSearchParams(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          key === "format" ? value : `'${value}'`,
        ]),
      ),
    )
  );
}
export async function fetchBody(
  body: "10" | "399",
  site: ReturnType<typeof validateQuery>,
  fetcher: typeof fetch = fetch,
) {
  try {
    const response = await fetcher(horizonsURL(body, site), {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new ServiceError(
        "JPL Horizons is unavailable. Retry when the service and network are reachable.",
        503,
        "UPSTREAM_HTTP",
      );
    let data: { result?: string; error?: string };
    try {
      data = (await response.json()) as typeof data;
    } catch {
      throw new ServiceError(
        "JPL returned a non-JSON response.",
        502,
        "UPSTREAM_FORMAT",
      );
    }
    if (!data || data.error || typeof data.result !== "string" || !data.result)
      throw new ServiceError(
        "JPL could not calculate this observer request.",
        502,
        "UPSTREAM_ERROR",
      );
    return parseHorizons(data.result, site.timeUTC);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      "JPL Horizons could not be reached within 12 seconds. No substitute telemetry is shown.",
      503,
      error instanceof DOMException && error.name === "TimeoutError"
        ? "TIMEOUT"
        : "NETWORK_ERROR",
    );
  }
}
