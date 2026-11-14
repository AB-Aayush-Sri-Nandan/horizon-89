/** Remote verification runner: saves raw authoritative evidence; never emits fallback values. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  validateQuery,
  horizonsURL,
  parseHorizons,
} from "../../server/horizons.ts";
const directory = resolve(process.argv[2] ?? ".data/horizons-verification");
await mkdir(directory, { recursive: true });
const cases = [
  {
    name: "south89-midnight",
    lat: -89,
    lon: 0,
    time: "2025-03-02T00:00:00.000Z",
  },
  { name: "south89-noon", lat: -89, lon: 0, time: "2025-03-02T12:00:00.000Z" },
  {
    name: "equator-leap-day",
    lat: 0,
    lon: 0,
    time: "2024-02-29T00:00:00.000Z",
  },
  { name: "north85", lat: 85, lon: 90, time: "2025-03-02T06:00:00.000Z" },
];
const report: {
  case: string;
  body: string;
  status: string;
  request: string;
  sha256?: string;
  geometry?: unknown;
  error?: string;
}[] = [];
for (const item of cases)
  for (const body of ["10", "399"] as const) {
    const site = validateQuery(
        new URLSearchParams({
          lat: String(item.lat),
          lon: String(item.lon),
          time: item.time,
        }),
      ),
      url = horizonsURL(body, site);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Remote HTTP ${response.status}`);
      const raw = await response.text();
      const parsed = JSON.parse(raw);
      if (parsed.error || !parsed.result)
        throw new Error("JPL returned no ephemeris");
      const geometry = parseHorizons(parsed.result, site.timeUTC);
      await writeFile(resolve(directory, `${item.name}-${body}.json`), raw);
      report.push({
        case: item.name,
        body,
        status: "retrieved-not-independently-cross-checked",
        request: url,
        sha256: createHash("sha256").update(raw).digest("hex"),
        geometry,
      });
    } catch (error) {
      report.push({
        case: item.name,
        body,
        status: "blocked-or-failed",
        request: url,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
await writeFile(
  resolve(directory, "report.json"),
  JSON.stringify(
    {
      runUTC: new Date().toISOString(),
      method:
        "Observer API retrieval and returned-time validation only. Independent official web/batch reference comparisons remain manual and must be recorded separately.",
      report,
    },
    null,
    2,
  ),
);
const passed = report.filter((r) => r.status.startsWith("retrieved")).length;
console.log(
  `${passed}/${report.length} upstream observer requests retrieved; this is not independent scientific validation. Report: ${directory}/report.json`,
);
if (passed !== report.length) process.exitCode = 1;
