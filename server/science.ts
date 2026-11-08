import { readFile, stat } from "node:fs/promises";
import { validateTerrainTile } from "../src/science/terrain.js";
export async function terrainEvidence(path: string) {
  try {
    if ((await stat(path)).size > 2_000_000)
      throw new Error("Terrain tile exceeds 2 MB budget");
    const tile = validateTerrainTile(JSON.parse(await readFile(path, "utf8")));
    return { state: "available" as const, tile, reason: null };
  } catch (error) {
    return {
      state: "unavailable" as const,
      tile: null,
      reason:
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? "No reviewed DEM has been imported. Authoritative source retrieval is required."
          : `Terrain rejected: ${error instanceof Error ? error.message : "invalid data"}`,
    };
  }
}
