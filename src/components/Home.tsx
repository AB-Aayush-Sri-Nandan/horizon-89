import { ArrowUpRight, Orbit, Crosshair } from "lucide-react";
export default function Home({
  onExplore,
  onLunar,
  onMissions,
}: {
  onExplore: () => void;
  onLunar: () => void;
  onMissions: () => void;
}) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <img
        className="space-image"
        src="/horizon89-lunar-base.svg"
        alt=""
      />
      <div className="home-content">
        <span className="eyebrow home-kicker">
          <i /> AN INDEPENDENT EXPLORATION PLATFORM
        </span>
        <p className="home-wordmark">
          HORIZON <span>89</span> <span className="home-index">/ 001</span>
        </p>
        <h1 id="home-title">
          Beyond Earth.
          <br />
          <em>Into the Unknown.</em>
        </h1>
        <p className="home-description">
          Explore our Solar System. Discover the missions shaping lunar
          exploration. Follow the evidence to the edge of light.
        </p>
        <div className="home-actions">
          <button className="primary" onClick={onExplore}>
            <Orbit size={18} /> Explore Universe <ArrowUpRight size={18} />
          </button>
          <button onClick={onLunar}>
            <Crosshair size={18} /> Discover Lunar Missions{" "}
            <ArrowUpRight size={18} />
          </button>
          <button onClick={onMissions}>Mission Intelligence <ArrowUpRight size={18} /></button>
        </div>
        <div className="home-principles">
          <span>01 / EXPLORE THE PLANETS</span>
          <span>02 / INVESTIGATE THE MOON</span>
          <span>03 / KNOW YOUR SOURCES</span>
        </div>
      </div>
      <div className="home-bottom">
        <span className="mono">CURIOSITY, GROUNDED IN EVIDENCE.</span>
        <p>
          Illustrative lunar exploration visualization · Not a NASA photograph or scientific terrain dataset
          <br />
          <a
            href="/images/space-provenance.json"
            target="_blank"
            rel="noreferrer"
          >
            Source & display limitations ↗
          </a>{" "}
          · No NASA affiliation
        </p>
      </div>
    </section>
  );
}
