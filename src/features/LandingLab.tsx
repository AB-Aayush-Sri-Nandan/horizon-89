import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Database, MapPin, SlidersHorizontal, TriangleAlert } from "lucide-react";
import "./landing-lab.css";

type Criterion = {
  id: string;
  label: string;
  unit: string;
  requiredProduct: string;
};

const researchRegions = [
  { id: "malapert-a", name: "Malapert A", category: "Research location" },
  { id: "mons-mouton", name: "Mons Mouton", category: "Research location" },
  { id: "reiner-gamma", name: "Reiner Gamma", category: "Research location" },
  { id: "mare-crisium", name: "Mare Crisium", category: "Research location" },
  { id: "schrodinger", name: "Schrödinger Basin", category: "Research location" },
] as const;

const criteria: readonly Criterion[] = [
  { id: "slope", label: "Slope", unit: "degrees", requiredProduct: "Validated lunar DEM and slope method" },
  { id: "roughness", label: "Surface roughness", unit: "m", requiredProduct: "Resolution stated topography" },
  { id: "illumination", label: "Illumination", unit: "time window", requiredProduct: "Dated solar geometry and terrain shadow model" },
  { id: "visibility", label: "Earth visibility", unit: "time window", requiredProduct: "Ephemeris and terrain occultation model" },
  { id: "hazards", label: "Observed hazards", unit: "coverage", requiredProduct: "Mapped crater and boulder observations" },
  { id: "science", label: "Science evidence", unit: "datasets", requiredProduct: "Cited regional observation products" },
];

const initialWeights: Record<string, number> = Object.fromEntries(criteria.map((item) => [item.id, 3]));

/** A comparison workbench. Scores remain unavailable until real products are imported. */
export default function LandingLab({ onRegionChange }: { onRegionChange?: (region: string) => void }) {
  const [leftId, setLeftId] = useState<string>("malapert-a");
  const [rightId, setRightId] = useState<string>("mons-mouton");
  const [weights, setWeights] = useState<Record<string, number>>(initialWeights);
  const [view, setView] = useState<"matrix" | "method">("matrix");

  const left = researchRegions.find((item) => item.id === leftId) ?? researchRegions[0];
  const right = researchRegions.find((item) => item.id === rightId) ?? researchRegions[1];
  const totalWeight = useMemo(() => Object.values(weights).reduce((sum, weight) => sum + weight, 0), [weights]);
  useEffect(() => { onRegionChange?.(left.name + " / " + right.name); }, [left.name, right.name, onRegionChange]);

  return (
    <section className="lab-shell" aria-labelledby="lab-title">
      <div className="lab-aura" aria-hidden="true" />
      <div className="lab-heading">
        <div>
          <p className="lab-kicker"><span /> LANDING INTELLIGENCE / EVIDENCE WORKBENCH</p>
          <h1 id="lab-title">Explore the unknown. <em>Keep the evidence visible.</em></h1>
          <p className="lab-intro">Compare research locations and define an assessment method. No regional terrain products have been imported, so engineering suitability is not evaluated.</p>
        </div>
        <div className="lab-state" role="status"><TriangleAlert size={18} /> DATA IMPORT REQUIRED</div>
      </div>

      <div className="lab-layout">
        <aside className="lab-controls" aria-label="Comparison controls">
          <div className="lab-panel-head"><MapPin size={17} /><span>SELECT LOCATIONS</span></div>
          <p className="lab-muted">These names are research leads from the project brief. They are not verified landing sites.</p>
          <label htmlFor="lab-left">LOCATION A</label>
          <select id="lab-left" value={leftId} onChange={(event) => setLeftId(event.target.value)}>
            {researchRegions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label htmlFor="lab-right">LOCATION B</label>
          <select id="lab-right" value={rightId} onChange={(event) => setRightId(event.target.value)}>
            {researchRegions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {leftId === rightId && <p className="lab-inline-alert">Choose two different locations to compare.</p>}

          <div className="lab-divider" />
          <div className="lab-panel-head"><SlidersHorizontal size={17} /><span>ASSESSMENT PRIORITIES</span></div>
          <p className="lab-muted">Set priorities for a future assessment. Weights do not create a score without measured inputs.</p>
          <details className="lab-guide"><summary>How to use these controls</summary><p>First choose two research locations. Then set each priority from 0 (exclude) to 5 (highest importance). For example, increasing slope from 3 to 5 would give a future measured slope more influence than a criterion weighted 1. Today the result remains “Not evaluated” because no validated regional products are loaded.</p><p>Degrees describe surface slope; metres describe roughness. Illumination and Earth visibility require a stated time window. Coverage describes whether observations exist, not whether a site is safe.</p></details>
          {criteria.map((criterion) => (
            <label className="lab-weight" key={criterion.id}>
              <span>{criterion.label} <b>{weights[criterion.id]}</b></span>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={weights[criterion.id]}
                onChange={(event) => setWeights((previous) => ({ ...previous, [criterion.id]: Number(event.target.value) }))}
                aria-label={`${criterion.label} priority`}
              />
            </label>
          ))}
          <p className="lab-weight-total">TOTAL PRIORITY WEIGHT <strong>{totalWeight}</strong></p>
        </aside>

        <div className="lab-workspace">
          <div className="lab-location-row">
            {[left, right].map((region, index) => (
              <article className="lab-location" key={`${index}-${region.id}`}>
                <span className="lab-location-index">LOCATION {index === 0 ? "A" : "B"} / {region.category.toUpperCase()}</span>
                <h2>{region.name}</h2>
                <div className="lab-location-details"><span>COORDINATES <b>NOT VERIFIED</b></span><span>REGIONAL DATA <b>NOT IMPORTED</b></span></div>
                <span className="lab-location-halo" aria-hidden="true" />
              </article>
            ))}
          </div>

          <div className="lab-assessment">
            <div className="lab-assessment-top">
              <div><p className="lab-kicker">COMPARATIVE ASSESSMENT</p><h2>Not evaluated</h2></div>
              <div className="lab-coverage"><b>0 / {criteria.length}</b><span>validated criterion products</span></div>
            </div>
            <p>No critical terrain or environment datasets have been validated for these locations. Missing data does not count as low risk or improve a location's ranking.</p>
            <p className="lab-muted">Read the evidence matrix row by row: each row names the measurement needed, its units, and whether both selected locations have comparable data. Open “Method &amp; limits” for the proposed calculation and its constraints.</p>
            <div className="lab-tabs" role="tablist" aria-label="Assessment views">
              <button type="button" role="tab" aria-selected={view === "matrix"} onClick={() => setView("matrix")}>Evidence matrix</button>
              <button type="button" role="tab" aria-selected={view === "method"} onClick={() => setView("method")}>Method & limits</button>
            </div>
            {view === "matrix" ? (
              <div className="lab-matrix" role="table" aria-label="Dataset availability">
                <div className="lab-matrix-head" role="row"><span role="columnheader">CRITERION / REQUIRED PRODUCT</span><span role="columnheader">A</span><span role="columnheader">B</span></div>
                {criteria.map((criterion) => (
                  <div className="lab-matrix-row" role="row" key={criterion.id}>
                    <div role="cell"><b>{criterion.label}</b><small>{criterion.requiredProduct} · {criterion.unit}</small></div>
                    <span role="cell" className="lab-unknown">NO DATA</span>
                    <span role="cell" className="lab-unknown">NO DATA</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lab-method" role="tabpanel">
                <p><strong>Proposed formula:</strong> weighted mean of normalized, comparable measurements, shown only when each critical input has a source, coverage, resolution, date and uncertainty. User weights sum to {totalWeight}; a zero total would suspend computation.</p>
                <p><strong>Current state:</strong> no qualifying regional measurements are available. Data completeness is 0 of {criteria.length}, preliminary assessment is unavailable, engineering suitability has not been assessed, and this product does not certify landing safety.</p>
                <p><strong>Next evidence:</strong> acquire a lunar DEM, dated illumination and Earth visibility products, hazard observations and source metadata for each selected footprint. Validate coordinate system and comparable spatial resolution before computing contributions.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="lab-sources" aria-label="Data sources and limits">
          <div className="lab-panel-head"><Database size={17} /><span>SOURCE REGISTRY</span></div>
          <p className="lab-muted">Candidate portals for future imports. No measurement from these portals is used in this assessment.</p>
          <a href="https://pds.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA Planetary Data System <ArrowUpRight size={14} /></a>
          <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener noreferrer">NASA Moon Trek <ArrowUpRight size={14} /></a>
          <a href="https://www.nasa.gov/mission/clps-deliveries/" target="_blank" rel="noopener noreferrer">NASA CLPS deliveries <ArrowUpRight size={14} /></a>
          <div className="lab-divider" />
          <p className="lab-kicker">INTERPRETATION</p>
          <div className="lab-legend-item"><span className="lab-legend-dot lab-legend-dot--amber" /> Not imported</div>
          <div className="lab-legend-item"><span className="lab-legend-dot lab-legend-dot--cyan" /> Research lead</div>
          <div className="lab-legend-item"><span className="lab-legend-dot lab-legend-dot--gray" /> Not evaluated</div>
          <p className="lab-sources-note">The selected names do not imply confirmed landing coordinates, a mission assignment, a measured hazard level or a safety recommendation.</p>
        </aside>
      </div>
    </section>
  );
}
