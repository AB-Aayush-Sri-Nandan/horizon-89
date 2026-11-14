import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  ArrowUpRight,
  Crosshair,
  Globe2,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings2,
  ZoomIn,
  Satellite,
  BookOpen,
  Orbit,
  Network,
  Bot,
} from "lucide-react";
import {
  missions,
  missionCoordinates,
  datasets,
  type Coordinates,
  type Mission,
} from "./data/catalog";
import {
  advanceMinutes,
  formatCoordinates,
  utcDay,
  validCoordinates,
} from "./lib/science";
import Telemetry from "./components/Telemetry";
import Copilot from "./components/Copilot";
import Readiness from "./components/Readiness";
import {
  LunarImageryDetails,
  type LunarImage,
} from "./components/LunarImagery";
import { useScenePreferences } from "./lib/useScenePreferences";
import Home from "./components/Home";
import type { SolarSession } from "./lib/solar";
import TerrainPanel, { type TerrainLayers } from "./components/TerrainPanel";
import SiteComparison from "./components/SiteComparison";
import { useTerrain } from "./science/useTerrain";
const MoonViewer = lazy(() => import("./components/MoonViewer"));
const SolarExplorer = lazy(() => import("./components/SolarExplorer"));
const LunarExplorer = lazy(() => import("./features/LunarExplorer"));
const LandingLab = lazy(() => import("./features/LandingLab"));
const KnowledgeGraph = lazy(() => import("./features/KnowledgeGraph"));
const ResearchCopilot = lazy(() => import("./features/Copilot"));
const ResearchMissions = lazy(() => import("./features/Missions"));
const OriginalSolar = lazy(() => import("./features/SolarSystem"));
const ClassicHome = lazy(() => import("./components/ClassicViews").then((module) => ({ default: module.ClassicHome })));
const OperationsOverview = lazy(() => import("./components/ClassicViews").then((module) => ({ default: module.OperationsOverview })));
type Page = "platform-home" | "mission-control" | "lunar-science" | "clps-intelligence" | "solar-atlas" | "home" | "solar" | "moon" | "missions" | "lab" | "graph" | "control" | "copilot";
const pages: { id: Page; label: string; icon: typeof Crosshair }[] = [
  { id: "platform-home", label: "Home", icon: Globe2 },
  { id: "mission-control", label: "Mission control", icon: Crosshair },
  { id: "lunar-science", label: "Lunar science", icon: Layers },
  { id: "clps-intelligence", label: "CLPS intelligence", icon: Satellite },
  { id: "solar-atlas", label: "Solar System", icon: Orbit },
  { id: "home", label: "Explore", icon: Globe2 },
  { id: "solar", label: "Solar system", icon: Orbit },
  { id: "moon", label: "Moon explorer", icon: Globe2 },
  { id: "missions", label: "Missions", icon: Satellite },
  { id: "lab", label: "Landing Lab", icon: Layers },
  { id: "graph", label: "Knowledge Graph", icon: Network },
  { id: "control", label: "Operations overview", icon: Crosshair },
  { id: "copilot", label: "Horizon Intelligence", icon: Bot },
];
const primaryPages = pages.slice(0, 5);
const researchPages = pages.slice(5);
function pageFromHash(): Page {
  const value = window.location.hash.slice(1);
  if (value === "research-missions") return "missions";
  if (value === "solar-overview") return "solar";
  return pages.find((item) => item.id === value)?.id ?? "platform-home";
}
function MissionDetail({
  mission,
  onEvent,
}: {
  mission: Mission;
  onEvent: (date: string) => void;
}) {
  return (
    <>
      <div className="row">
        <span className="eyebrow">{mission.provider}</span>
        <span className="badge">HISTORICAL</span>
      </div>
      <h2>{mission.name}</h2>
      <p>{mission.description}</p>
      <dl className="detail-list">
        <div>
          <dt>Destination</dt>
          <dd>{mission.destination}</dd>
        </div>
        <div>
          <dt>Catalog status</dt>
          <dd>{mission.status}</dd>
        </div>
        <div>
          <dt>Surface coordinates</dt>
          <dd>{mission.coordinateNote}</dd>
          {mission.coordinateEvidence && (
            <dd>
              <a
                href={mission.coordinateEvidence.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                As-landed coordinate source ↗
              </a>
              <p>
                {mission.coordinateEvidence.convention} · precision{" "}
                {mission.coordinateEvidence.precisionDegrees}° · uncertainty{" "}
                {mission.coordinateEvidence.uncertaintyM === null
                  ? "not supplied"
                  : mission.coordinateEvidence.uncertaintyM + " m"}{" "}
                · published {mission.coordinateEvidence.publishedOn}
              </p>
            </dd>
          )}
        </div>
      </dl>
      <p>
        Landing outcome: {mission.landingOutcome}. {mission.resultsNote}
      </p>
      <details className="mission-provenance">
        <summary>Mission verification & coordinate reference</summary>
        <dl className="detail-list">
          <div>
            <dt>Verification status</dt>
            <dd>
              {missionCoordinates(mission)
                ? "Reviewed as-landed coordinate record"
                : "Historical transcription · exact landing coordinates unverified"}
            </dd>
          </div>
          <div>
            <dt>Reference frame / convention</dt>
            <dd>
              {mission.coordinateEvidence
                ? `${mission.coordinateEvidence.referenceFrame} / ${mission.coordinateEvidence.convention}`
                : "Not supplied for a verified landing location"}
            </dd>
          </div>
          <div>
            <dt>Datum / reference radius</dt>
            <dd>
              {mission.coordinateEvidence
                ? `${mission.coordinateEvidence.datum} / ${mission.coordinateEvidence.radiusM === null ? "Radius not supplied" : mission.coordinateEvidence.radiusM + " m"}`
                : "Unavailable; no radius inferred from destination names"}
            </dd>
          </div>
          <div>
            <dt>Source access / publication</dt>
            <dd>
              {mission.coordinateEvidence?.accessedOn ??
                mission.source.accessedOn ??
                "Access date not recorded; source not reverified here"}{" "}
              / {mission.source.asOf} historical snapshot
            </dd>
          </div>
          <div>
            <dt>Uncertainty</dt>
            <dd>
              {mission.coordinateEvidence?.uncertaintyM != null
                ? mission.coordinateEvidence.uncertaintyM + " m"
                : "Not supplied; displayed decimal places are not accuracy"}
            </dd>
          </div>
        </dl>
      </details>
      <h3>Selected NASA investigations</h3>
      <ul className="payloads">
        {mission.payloads.map((payload) => (
          <li key={payload}>{payload}</li>
        ))}
      </ul>
      <h3>Verified historical events</h3>
      <div className="event-list">
        {mission.events.map((event) => (
          <button key={event.date} onClick={() => onEvent(event.date)}>
            <time>{event.date}</time>
            <div>
              <strong>
                {event.title}
                <ArrowUpRight size={14} />
              </strong>
              <p>{event.description}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="source-line">
        Historical snapshot as of {mission.source.asOf}. Dates are UTC calendar
        dates; exact event times are not asserted.
      </p>
      <a href={mission.source.url} target="_blank" rel="noreferrer">
        {mission.source.name} ↗
      </a>
    </>
  );
}
function Science({
  grid,
  onGrid,
  onPolar,
  evidence,
  layers,
  onLayers,
  site,
}: {
  grid: boolean;
  onGrid: () => void;
  onPolar: () => void;
  evidence: ReturnType<typeof useTerrain>;
  layers: TerrainLayers;
  onLayers: (value: TerrainLayers) => void;
  site: Coordinates | null;
}) {
  const [filter, setFilter] = useState("all");
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">89° SOUTH / LUNAR SCIENCE</span>
        <h1>
          Explore the edge of light<span className="red">.</span>
        </h1>
        <p>
          At the lunar poles, low solar angles make terrain essential to
          illumination and communication planning. Explore what the project can
          establish—and which observations are still needed.
        </p>
      </div>
      <div className="science-summary panel">
        <div>
          <h2>The 89°S study target</h2>
          <p>
            89°S, 0°E is an analyst-selected location, not an asserted CLPS
            landing site. A spherical globe gives global context; it cannot
            resolve local slopes, ice deposits or permanent shadow.
          </p>
        </div>
        <div className="button-stack">
          <button className="primary" onClick={onPolar}>
            <Crosshair size={16} />
            Inspect 89°S
          </button>
          <button aria-pressed={grid} onClick={onGrid}>
            <Layers size={16} />
            {grid ? "Hide" : "Show"} coordinate grid
          </button>
        </div>
      </div>
      <TerrainPanel
        evidence={evidence}
        layers={layers}
        onLayers={onLayers}
        site={site}
      />
      <div className="row dataset-header">
        <h2>Data availability</h2>
        <label>
          Show{" "}
          <select
            aria-label="Filter datasets"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All datasets</option>
            <option value="integrated">Integrated</option>
            <option value="missing">Missing datasets</option>
          </select>
        </label>
      </div>
      <div className="dataset-grid">
        {datasets
          .map((d) =>
            d.id === "lola" && evidence.tile
              ? {
                  ...d,
                  name: "Imported lunar DEM",
                  available: true,
                  kind: evidence.tile.metadata.productId,
                  description: `Native scale ${evidence.tile.metadata.mapScaleM} m/px; bounded downsampled polar display. ${evidence.tile.source.verticalDatum}`,
                }
              : d,
          )
          .filter(
            (d) =>
              filter === "all" ||
              (filter === "integrated" ? d.available : !d.available),
          )
          .map((d) => (
            <section className="panel dataset" key={d.id}>
              <div className="row">
                <BookOpen size={20} />
                <span className={`badge ${d.available ? "cyan" : ""}`}>
                  {d.available ? "INTEGRATED" : "UNAVAILABLE"}
                </span>
              </div>
              <h3>{d.name}</h3>
              <span className="eyebrow">{d.kind}</span>
              <p>{d.description}</p>
              <a href={d.url} target="_blank" rel="noreferrer">
                Source / documentation ↗
              </a>
            </section>
          ))}
      </div>
      <div className="notice">
        {evidence.tile
          ? "DEM samples available as documented above; no PSR mask or terrain-accessibility model is integrated."
          : "No reviewed DEM, slope map, PSR mask or terrain-accessibility model is integrated."}{" "}
        No numerical surface claims are made from an image texture. Horizons
        availability depends on external access.
      </div>
    </>
  );
}
export default function App() {
  const commandTrigger = useRef<HTMLButtonElement>(null),
    wasCommandOpen = useRef(false);
  const [lunarImage, setLunarImage] = useState<LunarImage>({
    state: "unavailable",
    url: "/textures/moon.jpg",
    reason:
      "Requested LROC product not yet imported; using the legacy qualitative map.",
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/imagery", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!controller.signal.aborted) setLunarImage(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const evidence = useTerrain();
  const [terrainLayers, setTerrainLayers] = useState<TerrainLayers>({
    elevation: false,
    slope: false,
  });
  const [solarBody, setSolarBody] = useState("Sun");
  const [solarSession, setSolarSession] = useState<SolarSession>({
    selected: "Sun",
    day: 0,
    tracking: true,
  });
  const { visible } = useScenePreferences();
  const [page, setPageState] = useState<Page>(pageFromHash),
    [activeId, setActiveId] = useState("manual"),
    [search, setSearch] = useState(""),
    [provider, setProvider] = useState("all");
  const setPage = useCallback((next: Page) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    setPageState(next);
  }, []);
  useEffect(() => {
    const onHashChange = () => setPageState(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [researchMission, setResearchMission] = useState<string>();
  const [researchRegion, setResearchRegion] = useState<string>();
  const [researchCoordinates, setResearchCoordinates] = useState<string>();
  const [manual, setManual] = useState<Coordinates>({
      latitude: -89,
      longitude: 0,
    }),
    [lat, setLat] = useState("-89"),
    [lon, setLon] = useState("0"),
    [siteError, setSiteError] = useState(""),
    [selectionNotice, setSelectionNotice] = useState("");
  const [grid, setGrid] = useState(false),
    [quality, setQuality] = useState<"low" | "medium" | "high">(() => {
      try {
        const v = localStorage.getItem("h89-quality");
        return v === "low" || v === "high" ? v : "medium";
      } catch {
        return "medium";
      }
    });
  const [date, setDate] = useState("2025-03-02"),
    [minutes, setMinutes] = useState(360),
    [playbackRequested, setPlaying] = useState(false),
    [speed, setSpeed] = useState(60);
  const [view, setView] = useState<{
    mode: "global" | "site" | "zoomIn" | "zoomOut";
    version: number;
  }>({ mode: "global", version: 0 });
  const [command, setCommand] = useState(false),
    [commandSearch, setCommandSearch] = useState("");
  const enterMoon = useCallback(() => {
    setPage("mission-control");
    setView((v) => ({ mode: "global", version: v.version + 1 }));
  }, [setPage]);
  const saveSolarSession = useCallback((session: SolarSession) => {
    setSolarSession((current) =>
      current.selected === session.selected &&
      current.day === session.day &&
      current.tracking === session.tracking &&
      current.falseColor === session.falseColor &&
      JSON.stringify(current.camera) === JSON.stringify(session.camera) &&
      JSON.stringify(current.target) === JSON.stringify(session.target)
        ? current
        : session,
    );
  }, []);
  const playing = playbackRequested && minutes < 1439;
  const mission = missions.find((m) => m.id === activeId) ?? null;
  const site = mission ? missionCoordinates(mission) : manual;
  const timeUTC = utcDay(date, minutes);
  const filtered = missions.filter(
    (m) =>
      (provider === "all" || m.provider === provider) &&
      `${m.name} ${m.provider} ${m.destination}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  useEffect(() => {
    try {
      localStorage.setItem("h89-quality", quality);
    } catch {
      /* Storage may be disabled. */
    }
  }, [quality]);
  useEffect(() => {
    if (!playing || !visible || page !== "mission-control") return;
    const id = setInterval(
      () => setMinutes((v) => advanceMinutes(v, speed, 0.25)),
      250,
    );
    return () => clearInterval(id);
  }, [playing, speed, visible, page]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
      if (e.key === "Escape") setCommand(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (wasCommandOpen.current && !command) commandTrigger.current?.focus();
    wasCommandOpen.current = command;
  }, [command]);
  useEffect(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [page]);
  function polar() {
    setSelectionNotice(
      "89°S study preset selected. This is an analyst coordinate, not a mission landing record.",
    );
    setManual({ latitude: -89, longitude: 0 });
    setLat("-89");
    setLon("0");
    setActiveId("manual");
    setPage("mission-control");
    setView((v) => ({ mode: "site", version: v.version + 1 }));
  }
  function selectMission(id: string) {
    setSelectionNotice("");
    setActiveId(id);
    setResearchMission(missions.find((mission) => mission.id === id)?.name);
    setView((v) => ({ mode: "global", version: v.version + 1 }));
  }
  function eventTime(day: string) {
    setDate(day);
    setMinutes(0);
    setPlaying(false);
    setPage("mission-control");
  }
  function pick(coordinates: Coordinates) {
    setSelectionNotice(
      "Study target selected from the globe. Unsurveyed spherical coordinate; not a verified landing site.",
    );
    setManual(coordinates);
    setLat(coordinates.latitude.toFixed(4));
    setLon(coordinates.longitude.toFixed(4));
    setActiveId("manual");
    setSiteError("");
  }
  return (
    <div
      className={`app-shell ${page === "solar-atlas" || page === "platform-home" ? "solar-entry" : ""} ${researchPages.some((item) => item.id === page) ? "legacy-workspace" : ""} ${page === "home" || page === "control" ? "classic-workspace" : ""}`}
    >
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById("main-content")?.focus({ preventScroll: false });
      }}>
        Skip to main content
      </a>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("platform-home");
          }}
          aria-label="HORIZON 89 home"
        >
          <div className="brand-symbol">
            H<span>89</span>
          </div>
          <div>
            <strong>
              HORIZON <b>89</b>
            </strong>
            <span>LUNAR EXPLORATION SYSTEMS</span>
          </div>
        </a>
        <nav aria-label="Primary navigation">
          {primaryPages.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={page === id ? "page" : undefined}
              onClick={() => setPage(id)}
              className={page === id ? "active" : ""}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button
          ref={commandTrigger}
          className="command-trigger"
          onClick={() => setCommand(true)}
          aria-label="Open commands"
        >
          <Search size={16} />
          <kbd>⌘ K</kbd>
        </button>
      </header>
      <nav className="research-nav" aria-label="Research workspaces">
        {researchPages.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-current={page === id ? "page" : undefined} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>
      <div className="workspace-strip">
        <span>
          <i className="red-dot" /> INDEPENDENT MISSION EXPLORER
        </span>
        <span className="mono">LUNAR SOUTH POLE / 89°S</span>
        <span>SCIENCE WITH PROVENANCE</span>
      </div>
      <main id="main-content" tabIndex={-1}>
        {page !== "solar-atlas" && page !== "platform-home" && !researchPages.some((item) => item.id === page) && (
          <Readiness evidence={evidence} />
        )}
        {page === "home" ? (
          <Suspense fallback={<div role="status">Loading Explore…</div>}>
            <ClassicHome navigate={setPage} />
          </Suspense>
        ) : page === "control" ? (
          <Suspense fallback={<div role="status">Loading Operations overview…</div>}>
            <OperationsOverview navigate={setPage} />
          </Suspense>
        ) : page === "platform-home" ? (
          <Home
            onExplore={() => setPage("solar-atlas")}
            onLunar={() => setPage("mission-control")}
          />
        ) : page === "mission-control" ? (
          <>
            <div className="control-heading">
              <div>
                <span className="eyebrow">OPERATIONS / LUNAR SURFACE</span>
                <h1>
                  Mission control<span className="red">.</span>
                </h1>
              </div>
              <div className="heading-meta">
                <button
                  className="back-to-solar"
                  onClick={() => setPage("solar-atlas")}
                >
                  ← Back to Solar System
                </button>
                <span className="badge cyan">ANALYST WORKSPACE</span>
                <p>
                  Choose a mission, explore a study target, then inspect the
                  sources.
                </p>
              </div>
            </div>
            <div className="control-grid">
              <aside className="mission-rail panel">
                <div className="section-title">
                  <div className="row">
                    <span className="eyebrow">01 / MISSION CATALOG</span>
                    <span className="counter">0{missions.length}</span>
                  </div>
                  <h2>Destination: Moon</h2>
                </div>
                <div className="search-field">
                  <Search size={15} />
                  <input
                    aria-label="Search missions"
                    placeholder="Search missions, locations…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter mission provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="all">All providers</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.provider}>
                      {m.provider}
                    </option>
                  ))}
                </select>
                <div className="mission-list">
                  <button
                    className={`mission-card study ${activeId === "manual" ? "selected" : ""}`}
                    onClick={() => selectMission("manual")}
                  >
                    <span className="eyebrow">ANALYST TARGET</span>
                    <strong>South pole · 89°S</strong>
                    <span className="mono cyan-text">
                      {formatCoordinates(manual)}
                    </span>
                    <small>Study coordinate · not a mission landing</small>
                  </button>
                  {filtered.map((m, index) => (
                    <button
                      className={`mission-card ${activeId === m.id ? "selected" : ""}`}
                      key={m.id}
                      onClick={() => selectMission(m.id)}
                    >
                      <div className="row">
                        <span className="eyebrow">{m.provider}</span>
                        <span className="index">0{index + 1}</span>
                      </div>
                      <strong>{m.name}</strong>
                      <span>{m.destination}</span>
                      <small>{m.status} ↗</small>
                    </button>
                  ))}
                  {!filtered.length && (
                    <p className="notice">
                      No matching missions. Adjust search or provider.
                    </p>
                  )}
                </div>
                <form
                  className="manual-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const latitude = Number(lat),
                      longitude = Number(lon);
                    if (
                      !lat.trim() ||
                      !lon.trim() ||
                      !validCoordinates(latitude, longitude)
                    ) {
                      setSiteError(
                        "Enter latitude −90…90 and longitude −180…180.",
                      );
                      return;
                    }
                    setManual({ latitude, longitude });
                    setActiveId("manual");
                    setSiteError("");
                    setSelectionNotice(
                      "Study target applied. Unsurveyed spherical coordinate; no survey uncertainty is supplied.",
                    );
                    setView((v) => ({ mode: "site", version: v.version + 1 }));
                  }}
                >
                  <span className="eyebrow">MANUAL SURFACE TARGET</span>
                  <div className="coordinate-inputs">
                    <label>
                      Latitude °
                      <input
                        aria-label="Latitude"
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        required
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                      />
                    </label>
                    <label>
                      Longitude ° E
                      <input
                        aria-label="Longitude"
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        required
                        value={lon}
                        onChange={(e) => setLon(e.target.value)}
                      />
                    </label>
                  </div>
                  <button className="wide">
                    Apply target <ArrowUpRight size={14} />
                  </button>
                  {siteError && (
                    <p role="alert" className="error">
                      {siteError}
                    </p>
                  )}
                </form>
              </aside>
              <section
                className="lunar-stage panel"
                aria-label="Interactive lunar globe"
              >
                <div className="stage-top">
                  <div>
                    <span className="eyebrow">02 / LUNAR OBSERVATORY</span>
                    <h2>{mission ? mission.name : "The lunar frontier"}</h2>
                  </div>
                  <span className="badge">IMAGE MAP</span>
                </div>
                <div className="moon-canvas">
                  <Suspense
                    fallback={
                      <div className="scene-fallback">
                        Loading lunar viewer…
                      </div>
                    }
                  >
                    <MoonViewer
                      site={site}
                      grid={grid}
                      quality={quality}
                      view={view}
                      onPick={pick}
                      image={lunarImage}
                      markerKind={mission && site ? "verified" : "study"}
                      terrainTile={evidence.tile}
                      terrainLayers={terrainLayers}
                    />
                  </Suspense>
                </div>
                <div className="stage-tools">
                  <button
                    aria-label="Zoom in Moon"
                    title="Zoom in"
                    onClick={() =>
                      setView((v) => ({
                        mode: "zoomIn",
                        version: v.version + 1,
                      }))
                    }
                  >
                    +
                  </button>
                  <button
                    aria-label="Zoom out Moon"
                    title="Zoom out"
                    onClick={() =>
                      setView((v) => ({
                        mode: "zoomOut",
                        version: v.version + 1,
                      }))
                    }
                  >
                    −
                  </button>
                  <button
                    title="Reset global camera"
                    aria-label="Reset camera"
                    onClick={() =>
                      setView((v) => ({
                        mode: "global",
                        version: v.version + 1,
                      }))
                    }
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    title="Focus selected target"
                    disabled={!site}
                    aria-label="Focus selected target"
                    onClick={() =>
                      setView((v) => ({ mode: "site", version: v.version + 1 }))
                    }
                  >
                    <Crosshair size={16} />
                  </button>
                  <button
                    title="Coordinate grid"
                    aria-label="Toggle coordinate grid"
                    aria-pressed={grid}
                    onClick={() => setGrid((v) => !v)}
                  >
                    <Globe2 size={16} />
                  </button>
                  <button
                    title="Focus 89 degrees south"
                    aria-label="Focus 89 degrees south"
                    onClick={polar}
                  >
                    89°S
                  </button>
                </div>
                <div className="stage-bottom">
                  <div>
                    <span className="eyebrow">
                      SELECTED SURFACE TARGET ·{" "}
                      {mission
                        ? site
                          ? "AS-LANDED RECORD"
                          : "UNVERIFIED LOCATION"
                        : "STUDY / UNSURVEYED"}
                    </span>
                    <strong className="mono">{formatCoordinates(site)}</strong>
                    <p>
                      {mission
                        ? mission.destination
                        : "Manual study coordinate · east-positive longitude"}
                    </p>
                  </div>
                  <div className="view-instructions">
                    <ZoomIn size={16} />
                    <span>
                      Drag to rotate · scroll/pinch to zoom
                      <br />
                      Right-drag/two fingers to pan · double-click to select
                    </span>
                  </div>
                </div>
                <div className="stage-caption">
                  <span>
                    {lunarImage.state === "available"
                      ? "LROC WAC · 8 px/degree"
                      : "Legacy qualitative image · requested LROC unavailable"}
                  </span>
                  <span>Studio lighting · not simulation illumination</span>
                </div>
              </section>
              <Telemetry site={site} timeUTC={timeUTC} playing={playing} />
            </div>
            {selectionNotice && (
              <p role="status" className="selection-notice">
                {selectionNotice}
              </p>
            )}
            <section className="timeline panel" aria-label="Mission timeline">
              <div className="timeline-play">
                <button
                  className="primary"
                  aria-label={playing ? "Pause timeline" : "Play timeline"}
                  onClick={() => {
                    if (minutes >= 1439) setMinutes(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <label className="sr-only" htmlFor="speed">
                  Playback speed
                </label>
                <select
                  id="speed"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={1}>1×</option>
                  <option value={60}>60×</option>
                  <option value={600}>600×</option>
                </select>
              </div>
              <div className="scrubber">
                <div className="row">
                  <label htmlFor="timeline">SIMULATION TIME / UTC</label>
                  <strong className="mono" data-testid="simulation-time">
                    {timeUTC.slice(11, 19)}
                  </strong>
                </div>
                <input
                  id="timeline"
                  type="range"
                  min="0"
                  max="1439"
                  step="1"
                  value={minutes}
                  onChange={(e) => {
                    setMinutes(Number(e.target.value));
                    setPlaying(false);
                  }}
                />
                <div className="row muted mono">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:59</span>
                </div>
              </div>
              <label className="date-label">
                UTC DATE
                <input
                  aria-label="Simulation date"
                  type="date"
                  min="1962-01-01"
                  max="2100-12-31"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDate(e.target.value);
                      setPlaying(false);
                    }
                  }}
                />
              </label>
              <div className="timeline-note">
                <span className="badge">
                  {minutes >= 1439 ? "DAY COMPLETE" : "SIMULATION CLOCK"}
                </span>
                <p>
                  Time control is simulated. Geometry is queried when paused.
                </p>
              </div>
            </section>
            <LunarImageryDetails image={lunarImage} />
            <div className="control-lower">
              <section className="panel selected-details">
                {mission ? (
                  <MissionDetail mission={mission} onEvent={eventTime} />
                ) : (
                  <>
                    <span className="eyebrow">MISSION PLANNING / 89°S</span>
                    <h2>A new perspective on the south pole.</h2>
                    <p>
                      Inspect a manually selected surface coordinate. The cyan
                      marker shows your study target. Select a catalog mission
                      for its history and sources; unverified landing
                      coordinates are never plotted.
                    </p>
                    <div className="row">
                      <button onClick={() => setPage("lunar-science")}>
                        Explore lunar science <ArrowUpRight size={15} />
                      </button>
                      <a
                        href="https://www.nasa.gov/commercial-lunar-payload-services/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        About NASA CLPS ↗
                      </a>
                    </div>
                  </>
                )}
              </section>
              <section className="panel operational-note">
                <span className="eyebrow">
                  DATA INTEGRITY / READ BEFORE PLANNING
                </span>
                <h3>Seeing the surface is only the beginning.</h3>
                <p>
                  Imagery is not elevation. Geometric Earth visibility is not a
                  working radio link. Permanent shadow needs terrain and
                  long-term illumination analysis.
                </p>
                <button onClick={() => setPage("lunar-science")}>
                  Inspect data availability <ArrowUpRight size={15} />
                </button>
              </section>
            </div>
          </>
        ) : page === "lunar-science" ? (
          <div className="content-page">
            <Science
              grid={grid}
              onGrid={() => setGrid((v) => !v)}
              onPolar={polar}
              evidence={evidence}
              layers={terrainLayers}
              onLayers={setTerrainLayers}
              site={site}
            />
          </div>
        ) : page === "clps-intelligence" ? (
          <div className="content-page">
            <div className="page-intro">
              <span className="eyebrow">CLPS / MISSION INTELLIGENCE</span>
              <h1>
                Small landers. Big questions<span className="red">.</span>
              </h1>
              <p>
                A curated historical snapshot of commercial lunar science
                deliveries. Compare providers, scientific objectives and
                documented events. This is not a live mission-status feed.
              </p>
            </div>
            <div className="comparison-table panel">
              <table>
                <caption>CLPS historical mission comparison</caption>
                <thead>
                  <tr>
                    <th>Mission</th>
                    <th>Provider</th>
                    <th>Destination</th>
                    <th>Snapshot status</th>
                    <th>Explore</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map((m) => (
                    <tr key={m.id}>
                      <th>{m.name}</th>
                      <td>{m.provider}</td>
                      <td>{m.destination}</td>
                      <td>
                        {m.status}
                        <br />
                        <small>As of {m.source.asOf}</small>
                      </td>
                      <td>
                        <button
                          aria-label={`Select ${m.name}`}
                          onClick={() => {
                            selectMission(m.id);
                            setPage("mission-control");
                          }}
                        >
                          Select <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SiteComparison
              study={manual}
              tile={evidence.tile}
              timeUTC={timeUTC}
            />
            <div className="mission-detail-grid">
              {missions.map((m) => (
                <section className="panel selected-details" key={m.id}>
                  <MissionDetail
                    mission={m}
                    onEvent={(day) => {
                      selectMission(m.id);
                      eventTime(day);
                    }}
                  />
                </section>
              ))}
            </div>
          </div>
        ) : page === "moon" ? (
          <Suspense fallback={<div role="status">Loading Moon explorer…</div>}>
            <LunarExplorer onBack={() => setPage("solar")} onCoordinateChange={setResearchCoordinates} image={lunarImage} />
          </Suspense>
        ) : page === "lab" ? (
          <Suspense fallback={<div role="status">Loading Landing Lab…</div>}>
            <LandingLab onRegionChange={setResearchRegion} />
          </Suspense>
        ) : page === "graph" ? (
          <Suspense fallback={<div role="status">Loading Knowledge Graph…</div>}>
            <KnowledgeGraph />
          </Suspense>
        ) : page === "copilot" ? (
          <Suspense fallback={<div role="status">Loading Horizon Intelligence…</div>}>
            <ResearchCopilot context={{ section: page, selectedMission: researchMission, selectedRegion: researchRegion, selectedCoordinates: researchCoordinates }} />
          </Suspense>
        ) : page === "missions" ? (
          <Suspense fallback={<div role="status">Loading research leads…</div>}>
            <ResearchMissions onMoon={() => setPage("moon")} onCopilot={(name) => { setResearchMission(name); setPage("copilot"); }} />
          </Suspense>
        ) : page === "solar" ? (
          <Suspense fallback={<div role="status">Loading solar overview…</div>}>
            <OriginalSolar onMoon={() => setPage("moon")} />
          </Suspense>
        ) : (
          <div className="content-page solar-host">
            <Suspense
              fallback={
                <div className="solar-loading">Loading planetary explorer…</div>
              }
            >
              <SolarExplorer
                onSelectBody={setSolarBody}
                onEnterMoon={enterMoon}
                moonImage={lunarImage}
                initialSession={solarSession}
                onSessionChange={saveSolarSession}
                quality={quality}
                onQualityChange={setQuality}
              />
            </Suspense>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span>
          HORIZON 89 <b>/</b> INDEPENDENT EXPLORATION · NO NASA AFFILIATION
        </span>
        <label>
          <Settings2 size={13} /> Graphics{" "}
          <select
            aria-label="Graphics quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as typeof quality)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <button onClick={() => setPage("lunar-science")}>
          Sources & limitations <ArrowUpRight size={13} />
        </button>
      </footer>
      {!researchPages.some((item) => item.id === page) && page !== "platform-home" && (
        <Copilot
          key={`${activeId}-${page}`}
          solarBody={page === "solar-atlas" ? solarBody : null}
          missionId={activeId}
          site={site}
          timeUTC={timeUTC}
        />
      )}
      {command && (
        <div className="modal-backdrop" onClick={() => setCommand(false)}>
          <section
            className="command-panel panel"
            role="dialog"
            aria-modal="true"
            aria-label="Commands"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const els = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>("input,button"),
                );
                const index = els.indexOf(
                  document.activeElement as HTMLElement,
                );
                els[
                  (index + (e.shiftKey ? -1 : 1) + els.length) % els.length
                ]?.focus();
              }
            }}
          >
            <div className="row">
              <label htmlFor="command-search">Navigate workspace</label>
              <button onClick={() => setCommand(false)}>Close / Esc</button>
            </div>
            <input
              id="command-search"
              autoFocus
              placeholder="Search commands…"
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
            />
            {!pages.some((p) =>
              p.label.toLowerCase().includes(commandSearch.toLowerCase()),
            ) && (
              <p role="status" className="notice">
                No matching workspace. Try “Mission”, “science” or “Home”.
              </p>
            )}
            {pages
              .filter((p) =>
                p.label.toLowerCase().includes(commandSearch.toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPage(p.id);
                    setCommand(false);
                    setCommandSearch("");
                  }}
                >
                  <p.icon size={16} />
                  {p.label}
                  <ArrowUpRight size={16} />
                </button>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
