import { useEffect, useState } from "react";
import { validateTerrainTile, type TerrainTile } from "./terrain";
export interface TerrainEvidence {
  state: "loading" | "available" | "unavailable";
  tile: TerrainTile | null;
  reason: string | null;
}
export function useTerrain() {
  const [evidence, setEvidence] = useState<TerrainEvidence>({
    state: "loading",
    tile: null,
    reason: null,
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch("/api/science", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Science inventory could not be loaded");
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setEvidence(
          data.state === "available"
            ? {
                state: "available",
                tile: validateTerrainTile(data.tile),
                reason: null,
              }
            : {
                state: "unavailable",
                tile: null,
                reason: data.reason ?? "No reviewed DEM imported",
              },
        );
      })
      .catch(
        (error) =>
          active &&
          setEvidence({
            state: "unavailable",
            tile: null,
            reason:
              error instanceof Error ? error.message : "Terrain unavailable",
          }),
      )
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return evidence;
}
