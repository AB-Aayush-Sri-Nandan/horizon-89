import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Database, GitCompareArrows, MapPin, Search, ShieldAlert, X } from "lucide-react";
import { missions, sources, sourceById, type Mission } from "../data/missions";
import "./missions.css";

type Props = { onMissionControl?: (mission: Mission) => void };
type Tab = "catalogue" | "comparison" | "timeline" | "sources";

const field = (value: string | number | null | undefined) => value ?? "Not verified";

export default function Missions({ onMissionControl }: Props) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [tab, setTab] = useState<Tab>("catalogue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [sort, setSort] = useState("name");

  const providers = useMemo(() => [...new Set(missions.map((mission) => mission.provider))].sort(), []);
  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase().trim();
    return missions
      .filter((mission) => provider === "all" || mission.provider === provider)
      .filter((mission) => !needle || [mission.name, mission.provider, mission.lander ?? ""].some((value) => value.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => sort === "provider" ? a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  }, [query, provider, sort]);
  const selected = missions.find((mission) => mission.id === selectedId) ?? null;
  const comparison = compareIds.map((id) => missions.find((mission) => mission.id === id)).filter((mission): mission is Mission => Boolean(mission));
  const events = missions.flatMap((mission) => mission.events.map((event) => ({ mission, event }))).sort((a, b) => a.event.date.localeCompare(b.event.date));
  const verifiedCount = missions.filter((mission) => mission.evidenceState === "verified").length;

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  }

  return (
    <main className="hm-missions">
      <div className="hm-missions__aura" aria-hidden="true" />
      <header className="hm-missions__intro">
        <p className="hm-missions__eyebrow">HORIZON 89 / MISSION INTELLIGENCE</p>
        <h1>Every mission begins with a question.</h1>
        <p>Investigate CLPS mission leads, examine what is known, and follow the evidence back to its source.</p>
        <div className="hm-missions__notice" role="status">
          <ShieldAlert size={18} />
          <span>Official NASA records are linked for completed missions. Planned missions remain clearly marked for revalidation because schedules and destinations can change.</span>
        </div>
      </header>

      <div className="hm-missions__stats" aria-label="Catalogue status">
        <div><b>{missions.length.toString().padStart(2, "0")}</b><span>Research leads</span></div>
        <div><b>{providers.length.toString().padStart(2, "0")}</b><span>Named providers</span></div>
        <div><b>{String(verifiedCount).padStart(2, "0")}</b><span>Verified records</span></div>
        <div><b>{events.length.toString().padStart(2, "0")}</b><span>Dated events</span></div>
      </div>

      <nav className="hm-missions__tabs" aria-label="Mission intelligence views">
        {(["catalogue", "comparison", "timeline", "sources"] as const).map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)} aria-current={tab === item ? "page" : undefined}>{item === "comparison" ? `Comparison ${compareIds.length ? `(${compareIds.length})` : ""}` : item}</button>)}
      </nav>

      {tab === "catalogue" && <>
        <div className="hm-missions__tools">
          <label className="hm-missions__search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search missions, providers, landers" aria-label="Search missions" /></label>
          <label><span>Provider</span><select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="all">All providers</option>{providers.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Mission name</option><option value="provider">Provider</option></select></label>
        </div>
        <p className="hm-missions__count">Showing {filtered.length} of {missions.length} research leads</p>
        {filtered.length === 0 ? <div className="hm-missions__empty">No leads match those filters. Try a different name or provider.</div> : <div className="hm-missions__grid">
          {filtered.map((mission, index) => <article key={mission.id} className="hm-missions__card" style={{ "--card-index": index } as React.CSSProperties}>
            <div className="hm-missions__card-top"><span className="hm-missions__serial">H89 / {String(index + 1).padStart(2, "0")}</span><span className={`hm-missions__pending ${mission.evidenceState}`}>{mission.evidenceState === "verified" ? "NASA verified" : mission.evidenceState === "partial" ? "Partially verified" : "Revalidation needed"}</span></div>
            <div className="hm-missions__orb" aria-hidden="true" />
            <p className="hm-missions__provider">{mission.provider}</p>
            <h2>{mission.name}</h2>
            <div className="hm-missions__card-facts"><span><MapPin size={15} /> {field(mission.destination)}</span><span><CalendarDays size={15} /> {mission.events.at(-1)?.date ?? "Schedule not verified"}</span></div>
            <div className="hm-missions__card-actions"><button type="button" onClick={() => setSelectedId(mission.id)}>Inspect record <ArrowUpRight size={16} /></button><button type="button" className={compareIds.includes(mission.id) ? "selected" : ""} aria-label={`${compareIds.includes(mission.id) ? "Remove" : "Add"} ${mission.name} ${compareIds.includes(mission.id) ? "from" : "to"} comparison`} aria-pressed={compareIds.includes(mission.id)} onClick={() => toggleCompare(mission.id)}><GitCompareArrows size={17} /></button></div>
          </article>)}
        </div>}
      </>}

      {tab === "comparison" && <section className="hm-missions__workspace" aria-label="Mission comparison">
        <div className="hm-missions__section-head"><div><p className="hm-missions__eyebrow">SIDE BY SIDE</p><h2>Compare what the evidence supports.</h2></div><p>Select up to three missions from the catalogue. Unknown values remain unknown.</p></div>
        {comparison.length === 0 ? <div className="hm-missions__empty"><GitCompareArrows /> Select missions using the compare icon on their cards.</div> : <div className="hm-missions__compare-scroll"><table><thead><tr><th scope="col">Field</th>{comparison.map((mission) => <th scope="col" key={mission.id}>{mission.name}<button type="button" onClick={() => toggleCompare(mission.id)} aria-label={`Remove ${mission.name} from comparison`}><X size={14} /></button></th>)}</tr></thead><tbody>{([ ["Provider", (m: Mission) => m.provider], ["Lander", (m: Mission) => field(m.lander)], ["Task order", (m: Mission) => field(m.taskOrder)], ["Mission status", (m: Mission) => field(m.status)], ["Outcome", (m: Mission) => field(m.outcome)], ["Destination", (m: Mission) => field(m.destination)], ["Coordinates", (m: Mission) => m.coordinates ? `${Math.abs(m.coordinates.latitude).toFixed(2)}°${m.coordinates.latitude < 0 ? "S" : "N"}, ${Math.abs(m.coordinates.longitude).toFixed(2)}°${m.coordinates.longitude < 0 ? "W" : "E"}` : "No verified landing coordinate"], ["Payload count", (m: Mission) => String(m.payloads.length)], ["Evidence", (m: Mission) => m.evidenceState] ] as [string, (mission: Mission) => string][]).map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{comparison.map((mission) => <td key={mission.id}>{render(mission)}</td>)}</tr>)}</tbody></table></div>}
      </section>}

      {tab === "timeline" && <section className="hm-missions__workspace" aria-label="Mission timeline"><div className="hm-missions__section-head"><div><p className="hm-missions__eyebrow">CHRONOLOGY</p><h2>A timeline built from dated evidence.</h2></div><p>Actual and planned dates are kept separate. Events appear only after an official source confirms them.</p></div>{events.length ? <ol className="hm-missions__timeline">{events.map(({ mission, event }) => <li key={event.id}><time dateTime={event.date}>{event.date}</time><b>{event.title}</b><span>{mission.name} · {event.dateKind}</span></li>)}</ol> : <div className="hm-missions__empty"><CalendarDays /> No dated events have been verified yet. The catalogue does not invent launch or landing dates.</div>}</section>}

      {tab === "sources" && <section className="hm-missions__workspace" aria-label="Sources"><div className="hm-missions__section-head"><div><p className="hm-missions__eyebrow">SOURCE REGISTRY</p><h2>Follow the evidence.</h2></div><p>Official sources reviewed for this catalogue, with an explicit verification date and scope.</p></div><div className="hm-missions__sources">{sources.map((source) => <article key={source.id}><Database size={21} /><div><h3>{source.title}</h3><p>{source.publisher} · {source.accessNote}</p><a href={source.url} target="_blank" rel="noopener noreferrer">Open official source <ArrowUpRight size={15} /></a></div></article>)}</div></section>}

      {selected && <div className="hm-missions__overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}><section className="hm-missions__detail" role="dialog" aria-modal="true" aria-label={`${selected.name} research record`}><button className="hm-missions__close" type="button" onClick={() => setSelectedId(null)} aria-label="Close record"><X /></button><p className="hm-missions__eyebrow">MISSION DOSSIER / {selected.evidenceState.toUpperCase()}</p><h2>{selected.name}</h2><p className="hm-missions__detail-intro">{selected.objective}</p><dl><div><dt>Provider</dt><dd>{selected.provider}</dd></div><div><dt>Lander</dt><dd>{field(selected.lander)}</dd></div><div><dt>Task order</dt><dd>{field(selected.taskOrder)}</dd></div><div><dt>Status / outcome</dt><dd>{field(selected.status)} / {field(selected.outcome)}</dd></div><div><dt>Landing region</dt><dd>{field(selected.destination)}</dd></div><div><dt>Coordinates</dt><dd>{selected.coordinates ? `${Math.abs(selected.coordinates.latitude).toFixed(2)}° ${selected.coordinates.latitude < 0 ? "S" : "N"}, ${Math.abs(selected.coordinates.longitude).toFixed(2)}° ${selected.coordinates.longitude < 0 ? "W" : "E"} · ${selected.coordinates.confidence}` : "No verified landing marker"}</dd></div></dl>{selected.payloads.length > 0 && <><h3>Payloads ({selected.payloads.length})</h3><ul className="hm-missions__payloads">{selected.payloads.map((payload) => <li key={payload}>{payload}</li>)}</ul></>}<h3>Source trail</h3><div className="hm-missions__detail-sources">{selected.sourceIds.map((id) => { const source = sourceById(id); return source && <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}: {source.title} <ArrowUpRight size={14} /></a>; })}</div><div className="hm-missions__detail-actions">{onMissionControl && <button type="button" onClick={() => onMissionControl(selected)}>Open in Mission Control <ArrowUpRight size={14} /></button>}</div></section></div>}
    </main>
  );
}
