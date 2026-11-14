import { readFile, realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
export const mercuryNames = ["Mercury_1_4878 (1).glb", "Mercury_1_4878.glb"];
/** Only serve the requested local source model, never arbitrary filesystem paths. */
export async function mercuryAsset(base = resolve(".data/manual-assets")) {
  for (const name of mercuryNames) {
    try {
      const path = await realpath(resolve(base, name));
      if (!path.startsWith((await realpath(base)) + "/")) continue;
      const info = await stat(path);
      if (!info.isFile() || info.size > 32 * 1024 * 1024 || info.size < 20)
        continue;
      const data = await readFile(path);
      if (
        data.readUInt32LE(0) !== 0x46546c67 ||
        data.readUInt32LE(4) !== 2 ||
        data.readUInt32LE(8) !== data.length ||
        data.readUInt32LE(16) !== 0x4e4f534a
      )
        continue;
      const size = data.readUInt32LE(12);
      if (size > data.length - 20) continue;
      const gltf = JSON.parse(data.subarray(20, 20 + size).toString("utf8"));
      // External references could escape the intended asset boundary or leak network requests.
      if (
        [...(gltf.buffers ?? []), ...(gltf.images ?? [])].some(
          (entry: { uri?: string }) =>
            entry.uri && !entry.uri.startsWith("data:"),
        )
      )
        continue;
      if (gltf.extensionsRequired?.length) continue; // No unconfigured Draco/KTX decoder.
      return { name, data };
    } catch {
      /* Missing/invalid local upload leaves the existing Mercury fallback usable. */
    }
  }
  return null;
}
