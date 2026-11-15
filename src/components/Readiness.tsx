import { useEffect, useState } from "react";
import type { TerrainEvidence } from "../science/useTerrain";
export default function Readiness({ evidence }: { evidence: TerrainEvidence }) {
  const [api, setAPI] = useState<{ copilot: boolean } | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch("/api/health", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("API unavailable");
        return r.json();
      })
      .then((data) => {
        if (active) setAPI({ copilot: data.copilotKeyPresent === true });
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return (
    <section className="readiness-strip" aria-label="Scientific readiness">
      <div>
        <span className="readiness-dot local" />
        <span>
          IMAGERY<strong>Bundled image map</strong>
        </span>
      </div>
      <div>
        <span className={`readiness-dot ${evidence.tile ? "local" : ""}`} />
        <span>
          TERRAIN
          <strong>
            {evidence.state === "loading"
              ? "Checking inventory"
              : evidence.tile
                ? "Imported · review provenance"
                : "No reviewed DEM"}
          </strong>
        </span>
      </div>
      <div>
        <span className="readiness-dot" />
        <span>
          EPHEMERIDES
          <strong>
            {failed ? "API unreachable" : "Remote · query required"}
          </strong>
        </span>
      </div>
      <div>
        <span className={`readiness-dot ${api?.copilot ? "local" : ""}`} />
        <span>
          AI COPILOT
          <strong>
            {failed
              ? "API unreachable"
              : api
                ? api.copilot
                  ? "Key present · unverified"
                  : "Server key missing"
                : "Checking configuration"}
          </strong>
        </span>
      </div>
      <p>
        Configuration is not upstream validation. No synthetic science fallback.
      </p>
    </section>
  );
}
