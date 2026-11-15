import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowUpRight, Compass, Network, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { missions, sources } from "../data/missions";
import "./knowledge-graph.css";

type NodeKind = "provider" | "mission" | "lander" | "source";
type GraphNode = { id: string; label: string; kind: NodeKind; x: number; y: number; detail: string; url?: string };
type GraphEdge = { id: string; from: string; to: string; label: string };

const palette: Record<NodeKind, string> = {
  provider: "#80d5e6",
  mission: "#aeb5ff",
  lander: "#dfc9b6",
  source: "#a7c7a5",
};

function makeGraph(provider: string, query: string, showLanders: boolean, showSources: boolean) {
  const matching = missions.filter((mission) => mission.provider === provider && `${mission.name} ${mission.lander ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const gap = 104;
  const top = Math.max(118, (590 - gap * Math.max(0, matching.length - 1)) / 2);
  const nodes: GraphNode[] = [{ id: `provider:${provider}`, label: provider, kind: "provider", x: 120, y: 300, detail: "Provider association is a research lead from the project brief; official catalogue verification is pending." }];
  const edges: GraphEdge[] = [];
  matching.forEach((mission, index) => {
    const missionId = `mission:${mission.id}`;
    const y = top + gap * index;
    nodes.push({ id: missionId, label: mission.name, kind: "mission", x: 380, y, detail: `Research lead · status, task order, destination and outcome are not verified. ${mission.verifiedAt ? `Checked ${mission.verifiedAt}.` : "Not yet verified against NASA."}` });
    edges.push({ id: `provider-${mission.id}`, from: `provider:${provider}`, to: missionId, label: "proposed association" });
    if (showLanders && mission.lander) {
      const landerId = `lander:${mission.id}`;
      nodes.push({ id: landerId, label: mission.lander, kind: "lander", x: 650, y, detail: `Lander name supplied in the research brief for ${mission.name}; official mission page verification is pending.` });
      edges.push({ id: `lander-${mission.id}`, from: missionId, to: landerId, label: "lander to verify" });
    }
  });
  if (showSources && matching.length) {
    const sourceIds = [...new Set(matching.flatMap((mission) => mission.sourceIds))];
    sourceIds.forEach((sourceId, index) => {
      const source = sources.find((candidate) => candidate.id === sourceId);
      if (!source) return;
      const sourceNodeId = `source:${source.id}`;
      nodes.push({ id: sourceNodeId, label: source.publisher === "NASA Science" ? "NASA Science CLPS" : "NASA CLPS deliveries", kind: "source", x: 920, y: 240 + index * 145, detail: `Verification target: ${source.title}. ${source.accessNote}`, url: source.url });
      matching.forEach((mission) => {
        if (mission.sourceIds.includes(source.id)) {
          edges.push({ id: `source-${mission.id}-${source.id}`, from: `mission:${mission.id}`, to: sourceNodeId, label: "source to check" });
        }
      });
    });
  }
  return { nodes, edges, matching };
}

export default function KnowledgeGraph() {
  const providers = useMemo(() => [...new Set(missions.map((mission) => mission.provider))], []);
  const [provider, setProvider] = useState(providers[0] ?? "");
  const [query, setQuery] = useState("");
  const [showLanders, setShowLanders] = useState(true);
  const [showSources, setShowSources] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(`provider:${providers[0] ?? ""}`);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const graph = useMemo(() => makeGraph(provider, query, showLanders, showSources), [provider, query, showLanders, showSources]);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  function changeProvider(value: string) {
    setProvider(value);
    setSelectedId(`provider:${value}`);
    setPan({ x: 0, y: 0 });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as Element;
    if (target.closest("[data-graph-node]")) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start) return;
    setPan({ x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y });
  }

  function endDrag() { dragRef.current = null; }

  return (
    <section className="kg-shell" aria-labelledby="kg-title">
      <header className="kg-intro">
        <div><p className="kg-kicker"><Network size={13} /> MISSION KNOWLEDGE GRAPH / RESEARCH MODE</p><h1 id="kg-title">Follow the <em>connections.</em></h1><p>Explore how mission leads, landers and official source pages relate. Every current connection is pending verification, so this graph is a research index rather than a confirmed mission record.</p></div>
        <div className="kg-status"><span className="kg-status-light" /> 0 VERIFIED RELATIONSHIPS</div>
      </header>

      <div className="kg-layout">
        <aside className="kg-tools" aria-label="Graph filters">
          <h2><Compass size={16} /> EXPLORER</h2>
          <label className="kg-label" htmlFor="kg-provider">PROVIDER FOCUS</label>
          <select id="kg-provider" value={provider} onChange={(event) => changeProvider(event.target.value)}>{providers.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="kg-label" htmlFor="kg-search">SEARCH FOCUSED MISSIONS</label>
          <div className="kg-search"><Search size={16} /><input id="kg-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mission or lander" /></div>
          <p className="kg-label">VISIBLE CATEGORIES</p>
          <label className="kg-check"><input type="checkbox" checked={showLanders} onChange={(event) => setShowLanders(event.target.checked)} /> <span className="kg-category-dot kg-category-dot--lander" /> Landers</label>
          <label className="kg-check"><input type="checkbox" checked={showSources} onChange={(event) => setShowSources(event.target.checked)} /> <span className="kg-category-dot kg-category-dot--source" /> Sources to check</label>
          <div className="kg-rule" />
          <h3>DIRECT ACCESS</h3>
          <div className="kg-direct">{graph.matching.length ? graph.matching.map((mission) => <button type="button" key={mission.id} onClick={() => setSelectedId(`mission:${mission.id}`)} aria-pressed={selected.id === `mission:${mission.id}`}>{mission.name}<span>LEAD</span></button>) : <p>No mission leads match this search.</p>}</div>
        </aside>

        <div className="kg-graph-panel">
          <div className="kg-graph-bar"><span><span className="kg-bar-pulse" /> {graph.matching.length} MISSION LEADS IN FOCUS</span><div className="kg-zoom"><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(.65, +(value - .15).toFixed(2)))}><ZoomOut size={16} /></button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.7, +(value + .15).toFixed(2)))}><ZoomIn size={16} /></button><button type="button" aria-label="Reset graph view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={15} /></button></div></div>
          <div className="kg-stage" aria-label="Knowledge graph. Drag to pan; use arrow keys when focused." tabIndex={0} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={(event) => { const delta: Record<string, [number, number]> = { ArrowLeft: [25, 0], ArrowRight: [-25, 0], ArrowUp: [0, 25], ArrowDown: [0, -25] }; const move = delta[event.key]; if (move) { event.preventDefault(); setPan((previous) => ({ x: previous.x + move[0], y: previous.y + move[1] })); } }}>
            <div className="kg-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              <svg viewBox="0 0 1100 610" role="img" aria-label={`Graph for ${provider} with ${graph.matching.length} mission leads`}>
                <defs><pattern id="kg-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#b1c9e41c" /></pattern><linearGradient id="kg-edge" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#72d4df" stopOpacity=".45" /><stop offset="1" stopColor="#bdadf2" stopOpacity=".28" /></linearGradient></defs>
                <rect width="1100" height="610" fill="url(#kg-grid)" />
                {graph.edges.map((edge) => { const from = nodeMap.get(edge.from); const to = nodeMap.get(edge.to); if (!from || !to) return null; const active = selected.id === from.id || selected.id === to.id; return <path key={edge.id} d={`M ${from.x + 90} ${from.y} C ${from.x + 150} ${from.y}, ${to.x - 140} ${to.y}, ${to.x - 88} ${to.y}`} stroke={active ? "#abdfe9" : "url(#kg-edge)"} strokeOpacity={active ? .9 : .4} strokeWidth={active ? 1.8 : 1} strokeDasharray={edge.label === "proposed association" ? "none" : "4 5"} fill="none" />; })}
                {graph.nodes.map((node) => <g data-graph-node="" key={node.id} role="button" tabIndex={0} aria-label={`${node.kind}: ${node.label}; pending verification`} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); } }} className={`kg-svg-node ${selected.id === node.id ? "kg-svg-node--selected" : ""}`} transform={`translate(${node.x}, ${node.y})`}>
                  <rect x="-90" y="-26" width="180" height="52" rx="11" fill="#101d31" stroke={palette[node.kind]} strokeOpacity={selected.id === node.id ? .95 : .35} />
                  <circle cx="-70" cy="0" r="4" fill={palette[node.kind]} />
                  <text x="-57" y="-5" fill="#7f9ab6" fontSize="8" fontFamily="monospace" letterSpacing="1.3">{node.kind.toUpperCase()}</text>
                  <text x="-57" y="12" fill="#e8f5ff" fontSize="12" fontFamily="sans-serif">{node.label.length > 21 ? `${node.label.slice(0, 19)}…` : node.label}</text>
                </g>)}
              </svg>
            </div>
          </div>
          <div className="kg-graph-foot"><span>DRAG TO PAN · USE ZOOM CONTROLS ABOVE</span><span>ALL CONNECTIONS: VERIFICATION PENDING</span></div>
        </div>

        <aside className="kg-inspector" aria-label="Selected graph node details">
          <p className="kg-kicker">NODE INSPECTOR</p>
          <span className="kg-kind" style={{ color: palette[selected.kind] }}>{selected.kind.toUpperCase()} / RESEARCH LEAD</span>
          <h2>{selected.label}</h2><p>{selected.detail}</p>
          <div className="kg-inspector-meta"><span>EVIDENCE STATE</span><b>PENDING</b></div>
          <div className="kg-inspector-meta"><span>LAST VERIFIED</span><b>NOT VERIFIED</b></div>
          {selected.url && <a href={selected.url} target="_blank" rel="noopener noreferrer">OPEN OFFICIAL SOURCE <ArrowUpRight size={14} /></a>}
          <div className="kg-inspector-note">Source links identify pages to check. A link does not prove that the linked page supports this particular relationship.</div>
        </aside>
      </div>
    </section>
  );
}
