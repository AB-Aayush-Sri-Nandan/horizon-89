import ImportGuide from "./ImportGuide";
import { useEffect, useRef } from "react";
import type { Coordinates } from "../data/catalog";
import { sampleTerrain } from "../science/terrain";
import type { TerrainEvidence } from "../science/useTerrain";
export type TerrainLayers = { elevation: boolean; slope: boolean };
export default function TerrainPanel({
  evidence,
  layers,
  onLayers,
  site,
}: {
  evidence: TerrainEvidence;
  layers: TerrainLayers;
  onLayers: (value: TerrainLayers) => void;
  site: Coordinates | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tile = evidence.tile;
  const sample =
    tile && site ? sampleTerrain(tile, site.latitude, site.longitude) : null;
  useEffect(() => {
    const node = canvas.current;
    if (!node || !tile) return;
    node.width = tile.width;
    node.height = tile.height;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, node.width, node.height);
    const image = ctx.createImageData(tile.width, tile.height),
      values = layers.slope ? tile.slopes : tile.elevations,
      valid = values.filter((v): v is number => v !== null),
      min = valid.length ? Math.min(...valid) : 0,
      max = valid.length ? Math.max(...valid) : 1;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value === null) continue;
      const t = (value - min) / (max - min || 1);
      image.data.set(
        [
          Math.round(25 + t * 185),
          Math.round(70 + t * 150),
          Math.round(90 + t * 135),
          255,
        ],
        i * 4,
      );
    }
    ctx.putImageData(image, 0, 0);
  }, [tile, layers]);
  return (
    <section className="panel terrain-panel" aria-label="Terrain evidence">
      <div className="row">
        <div>
          <span className="eyebrow">
            SCIENTIFIC LAYERS / SOUTH POLAR REGION
          </span>
          <h2>Terrain evidence</h2>
        </div>
        <span className="badge">{evidence.state.toUpperCase()}</span>
      </div>
      <div className="layer-switches">
        <label>
          <input
            type="checkbox"
            aria-label="Elevation layer"
            checked={layers.elevation}
            disabled={!tile}
            onChange={(e) =>
              onLayers({ ...layers, elevation: e.target.checked })
            }
          />{" "}
          Elevation (m)
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Slope layer"
            checked={layers.slope}
            disabled={!tile || !tile.slopes.some((v) => v !== null)}
            onChange={(e) => onLayers({ ...layers, slope: e.target.checked })}
          />{" "}
          Native DEM slope (°)
        </label>
        <label>
          <input type="checkbox" aria-label="Permanent shadow layer" disabled />{" "}
          Permanent shadow — no reviewed mask
        </label>
        <label>
          <input type="checkbox" aria-label="Illumination layer" disabled />{" "}
          Terrain illumination — not calculated
        </label>
      </div>
      {tile ? (
        <>
          <div className="terrain-map">
            <canvas
              ref={canvas}
              aria-label={layers.slope ? "Slope map" : "Elevation map"}
              style={{
                display: layers.elevation || layers.slope ? "block" : "none",
              }}
            />
            <div className="terrain-legend">
              <span>
                {layers.slope ? "Slope in degrees" : "Elevation in metres"}
              </span>
              <span>
                {(() => {
                  const values = (
                    layers.slope ? tile.slopes : tile.elevations
                  ).filter((v): v is number => v !== null);
                  return values.length
                    ? `${Math.min(...values).toFixed(1)} → ${Math.max(...values).toFixed(1)} · `
                    : "No valid samples · ";
                })()}
                No-data transparent · north at top · east-positive longitude
              </span>
            </div>
          </div>
          <p>
            {tile.metadata.productId} · {tile.metadata.projection} · native map
            scale {tile.metadata.mapScaleM} m/px · processing epoch{" "}
            {tile.metadata.epoch}
          </p>
          <p>
            Display grid {tile.width}×{tile.height} covers {tile.bounds.south}…
            {tile.bounds.north}° latitude; it is downsampled context, not
            native-resolution terrain. Slopes use native samples, not this
            display grid. No photographic displacement.
          </p>
          <p className="mono">
            Selected nearest grid sample:{" "}
            {sample
              ? `${sample.elevationM.toFixed(1)} m / slope ${sample.slopeDegrees === null ? "unavailable" : sample.slopeDegrees.toFixed(2) + "°"} at ${sample.latitude.toFixed(3)}°, ${sample.longitude.toFixed(3)}°`
              : "Outside coverage or no-data"}
          </p>
          <details>
            <summary>Terrain provenance & integrity</summary>
            <p>
              {tile.source.attribution} · {tile.source.license} · Vertical
              datum: {tile.source.verticalDatum}
              <br />
              Integrity: {tile.source.integrity}
              <br />
              Retrieved: {tile.source.retrievedAt}
              <br />
              Processed:{" "}
              {tile.source.processedAt ?? "Not recorded in this artifact"}
              <br />
              Image SHA-256: {tile.source.imageSha256}
              <br />
              Label SHA-256: {tile.source.labelSha256}
            </p>
            <a href={tile.source.labelUrl} target="_blank" rel="noreferrer">
              Original product metadata ↗
            </a>
          </details>
        </>
      ) : (
        <div className="notice">
          {evidence.reason ?? "Loading scientific inventory…"} Elevation, slope
          and relief remain disabled. The Moon continues to use imagery only.
        </div>
      )}
      <ImportGuide />
      <details>
        <summary>Illumination and shadow evidence</summary>
        <p>
          No validated PSR mask, time-dependent illumination product or
          terrain-horizon model is imported. This application does not ray-trace
          sunlight or infer ice. Flat-horizon JPL Sun elevation, when available,
          does not resolve local obstruction or permanent shadow. Source and UTC
          time will be required for any future calculated shadow layer.
        </p>
        <a href="https://pgda.gsfc.nasa.gov/" target="_blank" rel="noreferrer">
          NASA planetary geodynamics products ↗
        </a>
      </details>
    </section>
  );
}
