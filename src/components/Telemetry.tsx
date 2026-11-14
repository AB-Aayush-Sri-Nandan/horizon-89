import { useEffect, useState } from "react";
import type { Coordinates } from "../data/catalog";
import {
  getLunarGeometry,
  type HorizonsGeometryResponse,
} from "../services/horizons";
interface Result {
  key: string;
  data: HorizonsGeometryResponse | null;
  error: string | null;
}
function ScientificCard({
  label,
  value,
  unit,
  source,
  status,
  time,
}: {
  label: string;
  value: number | null;
  unit: string;
  source: string;
  status: string;
  time: string;
}) {
  return (
    <section className="metric">
      <div className="row">
        <span>{label}</span>
        <span className="badge">{status}</span>
      </div>
      <strong className="mono">
        {value === null ? "—" : value.toFixed(2)}
        <small>{unit}</small>
      </strong>
      <div className="metric-scale">
        <i
          style={{
            width: `${value === null ? 0 : Math.max(0, Math.min(100, ((value + 90) / 180) * 100))}%`,
          }}
        />
      </div>
      <small>
        {source}
        <br />
        {time.replace("T", " ").slice(0, 19)} UTC
      </small>
    </section>
  );
}
export default function Telemetry({
  site,
  timeUTC,
  playing,
}: {
  site: Coordinates | null;
  timeUTC: string;
  playing: boolean;
}) {
  const [result, setResult] = useState<Result | null>(null),
    [retry, setRetry] = useState(0);
  const key = JSON.stringify({ site, timeUTC, retry });
  useEffect(() => {
    if (!site || playing) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getLunarGeometry(
        site.latitude,
        site.longitude,
        timeUTC,
        controller.signal,
      )
        .then((data) => {
          if (
            data.timeUTC !== timeUTC ||
            data.lunarSite.latitude !== site.latitude ||
            data.lunarSite.longitude !== site.longitude ||
            [data.sun, data.earth].some(
              (body) =>
                !Number.isFinite(body.elevationDegrees) ||
                Math.abs(body.elevationDegrees) > 90 ||
                !Number.isFinite(body.azimuthDegrees) ||
                body.azimuthDegrees < 0 ||
                body.azimuthDegrees > 360 ||
                Boolean(
                  body.returnedTimeUTC && body.returnedTimeUTC !== timeUTC,
                ),
            )
          )
            throw new Error(
              "Observer response does not match this site and time.",
            );
          setResult({ key, data, error: null });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({
              key,
              data: null,
              error:
                error instanceof Error ? error.message : "Geometry unavailable",
            });
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [site, timeUTC, playing, key]);
  const current = !playing && site && result?.key === key ? result : null;
  const data = current?.data ?? null;
  const status = playing
    ? "PAUSED QUERY"
    : !site
      ? "NO COORDINATES"
      : current?.error
        ? "UNAVAILABLE"
        : data
          ? "CALCULATED"
          : "REQUESTING";
  return (
    <aside className="telemetry panel">
      <div className="section-title">
        <span className="eyebrow">03 / OBSERVER GEOMETRY</span>
        <h2>Local horizon</h2>
        <span className="badge cyan">{status}</span>
      </div>
      <div className="metrics">
        <ScientificCard
          label="SUN ELEVATION"
          value={data?.sun.elevationDegrees ?? null}
          unit="°"
          source={data?.source ?? "JPL Horizons · unavailable"}
          status={data ? "CALCULATED" : "NO DATA"}
          time={timeUTC}
        />
        <ScientificCard
          label="EARTH ELEVATION"
          value={data?.earth.elevationDegrees ?? null}
          unit="°"
          source={data?.source ?? "JPL Horizons · unavailable"}
          status={data ? "CALCULATED" : "NO DATA"}
          time={timeUTC}
        />
      </div>
      <dl className="telemetry-list">
        <div>
          <dt>Solar azimuth</dt>
          <dd>
            {data ? `${data.sun.azimuthDegrees.toFixed(2)}°` : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Earth azimuth</dt>
          <dd>
            {data ? `${data.earth.azimuthDegrees.toFixed(2)}°` : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Sun / flat horizon</dt>
          <dd>
            {data
              ? data.sun.geometricallyAboveHorizon
                ? "Above"
                : "Below"
              : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Earth / flat horizon</dt>
          <dd>
            {data
              ? data.earth.geometricallyAboveHorizon
                ? "Above"
                : "Below"
              : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Terrain line of sight</dt>
          <dd>Not evaluated</dd>
        </div>
        <div>
          <dt>Surface illumination</dt>
          <dd>Not evaluated</dd>
        </div>
        <div>
          <dt>Communication link</dt>
          <dd>Not evaluated</dd>
        </div>
      </dl>
      <div className="notice" role="status">
        {playing
          ? "Pause playback to query a fixed UTC instant."
          : !site
            ? "This mission has no verified coordinates. Choose the 89°S study target or enter a manual location."
            : (current?.error ??
              (data
                ? "Airless observer geometry. Above-horizon Earth does not confirm a communications link."
                : "Requesting observer geometry…"))}
      </div>
      {site && !playing && (
        <button className="wide subtle" onClick={() => setRetry((v) => v + 1)}>
          Retry geometry request
        </button>
      )}
      <details className="provenance">
        <summary>Source & measurement limits</summary>
        <p>
          Degrees, east-positive lunar longitude. Azimuth north through east;
          local horizon at height 0 km. No terrain, radio-link budget, surface
          slope, refraction or shadow model.
        </p>
        <p>
          Requested: {timeUTC}
          <br />
          Returned Sun: {data?.sun.returnedTimeUTC ?? "Not supplied"}
          <br />
          Returned Earth: {data?.earth.returnedTimeUTC ?? "Not supplied"}
          <br />
          Fetched: {data?.fetchedAt ?? "Unavailable"}
          <br />
          Cache:{" "}
          {data
            ? data.cached
              ? "5-minute server cache"
              : "Fresh remote response"
            : "No data"}
        </p>
        <a
          href="https://ssd.jpl.nasa.gov/horizons/manual.html"
          target="_blank"
          rel="noreferrer"
        >
          JPL Horizons documentation ↗
        </a>
      </details>
    </aside>
  );
}
