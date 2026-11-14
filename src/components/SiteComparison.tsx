import { useState } from "react";
import {
  missions,
  missionCoordinates,
  type Coordinates,
} from "../data/catalog";
import { formatCoordinates } from "../lib/science";
import { sampleTerrain, type TerrainTile } from "../science/terrain";
export default function SiteComparison({
  study,
  tile,
  timeUTC,
}: {
  study: Coordinates;
  tile: TerrainTile | null;
  timeUTC: string;
}) {
  const [left, setLeft] = useState("manual"),
    [right, setRight] = useState("im1");
  const options = [
    { id: "manual", name: "Current study target", site: study, mission: null },
    ...missions.map((m) => ({
      id: m.id,
      name: m.name,
      site: missionCoordinates(m),
      mission: m,
    })),
  ];
  const a = options.find((v) => v.id === left)!,
    b = options.find((v) => v.id === right)!;
  const rows = [
    {
      label: "Coordinates / east-positive",
      value: (item: typeof a) => formatCoordinates(item.site),
    },
    {
      label: "Coordinate evidence",
      value: (item: typeof a) =>
        item.mission
          ? item.site
            ? "Reviewed as-landed record"
            : "Exact coordinates not verified"
          : "Analyst-selected study location",
    },
    {
      label: "Elevation (m)",
      value: (item: typeof a) => {
        const sample =
          item.site && tile
            ? sampleTerrain(tile, item.site.latitude, item.site.longitude)
            : null;
        return sample
          ? sample.elevationM.toFixed(1)
          : "Unavailable — no valid DEM sample";
      },
    },
    {
      label: "Slope (°)",
      value: (item: typeof a) => {
        const sample =
          item.site && tile
            ? sampleTerrain(tile, item.site.latitude, item.site.longitude)
            : null;
        return sample?.slopeDegrees != null
          ? sample.slopeDegrees.toFixed(2)
          : "Unavailable — no native slope evidence";
      },
    },
    {
      label: "DEM coverage",
      value: (item: typeof a) =>
        item.site &&
        tile &&
        sampleTerrain(tile, item.site.latitude, item.site.longitude)
          ? `${tile.metadata.productId} · nearest sampled cell`
          : "No valid covered sample",
    },
    ...[
      "Roughness",
      "Terrain illumination",
      "PSR proximity",
      "Sun visibility",
      "Earth visibility",
    ].map((label) => ({
      label,
      value: () => "Unavailable — not evaluated for this comparison",
    })),
    {
      label: "Confidence / precision",
      value: (item: typeof a) =>
        item.mission
          ? "Historical catalog; landing precision unverified"
          : "User input; no survey uncertainty supplied",
    },
  ];
  return (
    <section
      className="panel site-comparison"
      aria-label="Landing site evidence comparison"
    >
      <span className="eyebrow">
        EVIDENCE COMPARISON / NO SUITABILITY SCORE
      </span>
      <h2>Compare locations, expose the gaps.</h2>
      <div className="comparison-selects">
        <label>
          Location A
          <select
            aria-label="Comparison location A"
            value={left}
            onChange={(e) => setLeft(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location B
          <select
            aria-label="Comparison location B"
            value={right}
            onChange={(e) => setRight(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="comparison-table">
        <table>
          <caption>Evidence at requested UTC {timeUTC}</caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>{a.name}</th>
              <th>{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th>{row.label}</th>
                <td>{row.value(a)}</td>
                <td>{row.value(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        No overall suitability score. Roughness requires a stated spatial
        window; PSR proximity requires a georeferenced mask; Sun/Earth
        comparisons require per-site observer queries. Those quantities are not
        inferred from destination names.
      </p>
      {tile && (
        <details>
          <summary>Sample provenance and uncertainty</summary>
          <p>
            {tile.metadata.productId} · native scale {tile.metadata.mapScaleM}{" "}
            m/px · {tile.source.verticalDatum}. Values are nearest display-grid
            samples, not surveyed site measurements. Pixel registration and
            uncertainty require independent review; no accuracy estimate is
            invented.
          </p>
          <a href={tile.source.labelUrl} target="_blank" rel="noreferrer">
            DEM metadata ↗
          </a>
        </details>
      )}
      <div className="row">
        {[a, b].map((o, i) =>
          o.mission ? (
            <a
              key={i}
              href={o.mission.source.url}
              target="_blank"
              rel="noreferrer"
            >
              {o.mission.source.name} ↗
            </a>
          ) : (
            <span key={i} className="eyebrow">
              Study target · unsurveyed
            </span>
          ),
        )}
      </div>
    </section>
  );
}
