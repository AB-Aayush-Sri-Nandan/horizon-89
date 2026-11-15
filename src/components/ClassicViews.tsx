import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Bot, ChevronRight, Database, Globe2, Layers3, Network, Orbit, Radio, Satellite, ShieldCheck } from "lucide-react";
import "../styles/classic.css";
const SolarSystem = lazy(() => import("../features/SolarSystem"));
export type ClassicPage = "home" | "solar" | "moon" | "missions" | "lab" | "graph" | "control" | "copilot";

class SceneBoundary extends Component<
  { children: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="scene-fallback" role="alert">
          <Globe2 size={34} />
          <h2>{this.props.label} could not start</h2>
          <p>
            3D rendering is unavailable in this browser. The other research
            tools remain accessible.
          </p>
        </div>
      );
    return this.props.children;
  }
}

export function ClassicHome({ navigate }: { navigate: (page: ClassicPage) => void }) {
  const [heroReady, setHeroReady] = useState(false);
  return (
    <main className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-scene" aria-hidden="true">
          <div
            className={
              heroReady ? "hero-fallback-world loaded" : "hero-fallback-world"
            }
          />
          <SceneBoundary label="Solar preview">
            <Suspense fallback={null}>
              <SolarSystem
                onMoon={() => navigate("moon")}
                onHeroReady={() => setHeroReady(true)}
                hero
              />
            </Suspense>
          </SceneBoundary>
        </div>
        <div className="hero-vignette" />
        <div className="hero-main">
          <div className="eyebrow">
            <span className="signal-dot" /> A NEW WAY TO EXPLORE SPACE{" "}
            <span className="eyebrow-line" />
          </div>
          <h1 id="hero-title">
            <span className="hero-wordmark">
              HORIZON <em>89</em>
            </span>
            <span className="hero-headline">
              BEYOND EARTH.
              <br />
              <strong>INTO THE UNKNOWN.</strong>
            </span>
          </h1>
          <p>
            Explore worlds. Investigate the Moon. Discover humanity’s next
            horizon.
          </p>
          <div className="hero-actions">
            <button
              className="primary-action"
              onClick={() => navigate("solar")}
            >
              ENTER THE SOLAR SYSTEM <ArrowRight size={18} />
            </button>
            <button
              className="secondary-action"
              onClick={() => navigate("control")}
            >
              OPEN MISSION CONTROL <ChevronRight size={17} />
            </button>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={15} /> Independent exploration workspace <i />{" "}
            Scientific claims follow their sources
          </div>
        </div>
        <div className="hero-aside">
          <span>01 / 04</span>
          <div className="hairline" />
          <strong>OUR SOLAR SYSTEM</strong>
          <p>One star. Eight planets. Countless questions.</p>
          <span className="aside-state">VISUAL ORBITS · ILLUSTRATIVE</span>
        </div>
        <div className="hero-footer">
          <span>
            SCROLL TO EXPLORE <span className="scroll-glyph">↓</span>
          </span>
          <span>EARTH · MOON · BEYOND</span>
          <span>89° S — LUNAR SOUTH POLE</span>
        </div>
      </section>
      <section className="journey-section" aria-labelledby="journey-title">
        <div className="section-kicker">THE JOURNEY</div>
        <div className="journey-heading">
          <h2 id="journey-title">
            From distant worlds
            <br />
            to the lunar frontier.
          </h2>
          <p>
            A connected mission workspace for exploration, evidence, and the
            questions that come next.
          </p>
        </div>
        <div className="journey-grid">
          <button
            onClick={() => navigate("solar")}
            className="journey-card journey-solar"
          >
            <span>01 / EXPLORE</span>
            <Orbit size={36} />
            <h3>The Solar System</h3>
            <p>
              Move between the Sun and planets in an interactive spatial view.
            </p>
            <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate("moon")}
            className="journey-card journey-moon"
          >
            <span>02 / INVESTIGATE</span>
            <Globe2 size={36} />
            <h3>The Moon</h3>
            <p>
              Navigate selenographic coordinates and inspect available evidence.
            </p>
            <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate("missions")}
            className="journey-card journey-missions"
          >
            <span>03 / DISCOVER</span>
            <Satellite size={36} />
            <h3>CLPS missions</h3>
            <p>
              Trace commercial lunar missions, their destinations, and sources.
            </p>
            <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate("lab")}
            className="journey-card journey-lab"
          >
            <span>04 / ANALYSE</span>
            <Layers3 size={36} />
            <h3>Landing intelligence</h3>
            <p>
              Compare documented regions while keeping missing data visible.
            </p>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
      <section className="home-conclusion">
        <div className="section-kicker">THE MISSION</div>
        <h2>
          Curiosity deserves
          <br />
          <em>clear evidence.</em>
        </h2>
        <p>
          HORIZON 89 connects the wonder of exploration with a careful account
          of what is known, what is illustrative, and what still needs
          observation.
        </p>
        <button className="primary-action" onClick={() => navigate("control")}>
          ENTER MISSION CONTROL <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

export function OperationsOverview({ navigate }: { navigate: (page: ClassicPage) => void }) {
  const [time, setTime] = useState(() => new Date());
  const [health, setHealth] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/health", { signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (active) setHealth(r.ok ? "online" : "offline");
      })
      .catch(() => {
        if (active) setHealth("offline");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="control-page workspace-page">
      <div className="workspace-intro">
        <div className="section-kicker">HORIZON 89 / OPERATIONS</div>
        <h1>
          Mission control<span className="period">.</span>
        </h1>
        <p>
          The evidence and services behind this exploration workspace, in one
          view.
        </p>
      </div>
      <div className="control-grid">
        <div className="control-hero glass-panel">
          <div className="panel-top">
            <span>
              <Radio size={16} /> SYSTEM OVERVIEW
            </span>
            <span className="live-clock">
              {time.toISOString().replace("T", " ").slice(0, 19)} UTC
            </span>
          </div>
          <div className="control-metrics">
            <div>
              <small>FRONTEND</small>
              <strong>READY</strong>
            </div>
            <div>
              <small>LOCAL API</small>
              <strong className={health === "online" ? "good" : "muted"}>
                {health.toUpperCase()}
              </strong>
            </div>
            <div>
              <small>HORIZONS DATA</small>
              <strong className="muted">NOT CHECKED</strong>
            </div>
          </div>
        </div>
        <div className="control-side">
          <div className="glass-panel control-note">
            <div className="panel-top">
              <span>
                <Database size={16} /> DATA INTEGRITY
              </span>
              <span className="status-amber">SOURCE FIRST</span>
            </div>
            <h2>Honest by design.</h2>
            <p>
              No fabricated landing coordinates, terrain elevations, or live
              ephemeris. Dataset gaps remain visible until validated data is
              connected.
            </p>
            <button onClick={() => navigate("lab")}>
              INSPECT DATA COVERAGE <ArrowRight size={16} />
            </button>
          </div>
          <div className="glass-panel control-note">
            <div className="panel-top">
              <span>
                <Bot size={16} /> RESEARCH ASSISTANT
              </span>
              <span className="status-amber">SESSION BASED</span>
            </div>
            <h2>Explore with context.</h2>
            <p>
              Ask about the selected mission or region. AI access uses a
              temporary server session and requires a provider credential.
            </p>
            <button onClick={() => navigate("copilot")}>
              OPEN COPILOT <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="control-links">
        <button onClick={() => navigate("solar")}>
          <Orbit /> Solar System <ArrowRight />
        </button>
        <button onClick={() => navigate("moon")}>
          <Globe2 /> Lunar Explorer <ArrowRight />
        </button>
        <button onClick={() => navigate("missions")}>
          <Satellite /> CLPS Intelligence <ArrowRight />
        </button>
        <button onClick={() => navigate("graph")}>
          <Network /> Knowledge Graph <ArrowRight />
        </button>
      </div>
    </main>
  );
}

