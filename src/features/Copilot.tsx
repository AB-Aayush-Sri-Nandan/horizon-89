import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Check, ChevronDown, Eye, EyeOff, KeyRound, LockKeyhole, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import "./copilot.css";

type Context = { section: string; selectedMission?: string; selectedRegion?: string; selectedCoordinates?: string };
type Citation = { title: string; url: string; description?: string };
type Message = { id: number; role: "user" | "assistant"; text: string; citations?: Citation[] };
type Provider = "openai" | "gemini";
type Model = { id: string; name?: string };
type Session = { configured: boolean; provider?: Provider; model?: string; expiresAt?: string };

const questions = [
  "Which CLPS missions have verified lunar landing locations?",
  "What evidence supports this mission's status?",
  "Which terrain data are missing for landing analysis?",
  "Compare Malapert A and Mons Mouton using available evidence.",
];

const apiError = async (response: Response) => {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || `Request failed (${response.status}).`;
};

const request = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) throw new Error(await apiError(response));
  return response.json() as Promise<T>;
};

const safeSource = (url: string) => {
  try { return new URL(url).protocol === "https:"; } catch { return false; }
};

export default function Copilot({ context }: { context: Context }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<Session>({ configured: false });
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [configBusy, setConfigBusy] = useState(false);
  const [configError, setConfigError] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    let active = true;
    request<Session>("/api/session/config")
      .then((value) => { if (active) { setSession(value); if (value.provider) setProvider(value.provider); if (value.model) setModel(value.model); } })
      .catch(() => { if (active) setSessionError("The research server is offline."); });
    return () => { active = false; };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setKey(""); setShowKey(false); setModalOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const openSettings = () => {
    setConfigError(""); setConfigMessage(""); setModalOpen(true);
  };

  const closeSettings = () => {
    setKey(""); setShowKey(false); setModalOpen(false);
  };

  const send = async (raw: string) => {
    const message = raw.trim();
    setDraft("");
    if (message === "API KEY") { openSettings(); return; }
    if (!message || loading) return;
    setMessages((items) => [...items, { id: nextId.current++, role: "user", text: message }]);
    setLoading(true);
    try {
      const result = await request<{ answer: string; citations?: Citation[] }>("/api/research/copilot", {
        method: "POST", body: JSON.stringify({ message, context: { mission: context.selectedMission, region: context.selectedRegion, coordinates: context.selectedCoordinates, dataState: "source verification pending" } }),
      });
      setMessages((items) => [...items, {
        id: nextId.current++, role: "assistant", text: result.answer || "No answer was returned.",
        citations: result.citations?.filter((source) => safeSource(source.url)) || [],
      }]);
    } catch (error) {
      setMessages((items) => [...items, {
        id: nextId.current++, role: "assistant",
        text: error instanceof Error ? error.message : "The research service is unavailable.",
      }]);
    } finally { setLoading(false); }
  };

  const onSubmit = (event: FormEvent) => { event.preventDefault(); void send(draft); };

  const testConnection = async () => {
    if (!key && (!session.configured || session.provider !== provider)) { setConfigError("Enter an API key before testing this provider."); return; }
    setConfigBusy(true); setConfigError(""); setConfigMessage("");
    try {
      const result = await request<{ ok: boolean; models?: Model[] }>("/api/session/test", {
        method: "POST", body: JSON.stringify(key ? { provider, key } : {}),
      });
      setModels(result.models || []);
      if (result.models?.length && !result.models.some((entry) => entry.id === model)) setModel(result.models[0].id);
      setConfigMessage(`Connection verified. ${result.models?.length || 0} compatible models available.`);
    } catch (error) { setConfigError(error instanceof Error ? error.message : "Connection test failed."); }
    finally { setConfigBusy(false); }
  };

  const saveSession = async () => {
    if (!key && (!session.configured || session.provider !== provider)) { setConfigError("Enter an API key for this provider first."); return; }
    setConfigBusy(true); setConfigError(""); setConfigMessage("");
    try {
      const result = await request<Session>("/api/session/config", {
        method: "POST", body: JSON.stringify(key ? { provider, key, ...(model ? { model } : {}) } : { model }),
      });
      setSession(result); setSessionError(""); setKey(""); setShowKey(false);
      setConfigMessage("Credential saved in server memory for this session.");
    } catch (error) { setConfigError(error instanceof Error ? error.message : "Could not save this session."); }
    finally { setConfigBusy(false); }
  };

  const clearSession = async () => {
    setConfigBusy(true); setConfigError(""); setConfigMessage("");
    try {
      const response = await fetch("/api/session/config", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error(await apiError(response));
      setSession({ configured: false }); setKey(""); setModel(""); setModels([]);
      setConfigMessage("Credential cleared from server memory.");
    } catch (error) { setConfigError(error instanceof Error ? error.message : "Could not clear the credential."); }
    finally { setConfigBusy(false); }
  };

  const selectProvider = (next: Provider) => { setProvider(next); setModel(""); setModels([]); setConfigError(""); setConfigMessage(""); };

  return <section className="h89-ai" aria-label="Horizon Intelligence">
    <div className="h89-ai-heading">
      <div className="h89-ai-bot"><Bot size={29} strokeWidth={1.4} /></div>
      <div><span className="h89-ai-kicker">RESEARCH WORKSPACE / H89.07</span><h1>Horizon Intelligence</h1><p>Ask within the evidence. Follow every claim to its source.</p></div>
      <button className="h89-ai-new" type="button" onClick={() => setMessages([])}><RotateCcw size={16} /> New research session</button>
    </div>

    <div className="h89-ai-layout">
      <div className="h89-ai-conversation">
        <div className="h89-ai-contextbar"><span className="h89-ai-pulse" /> <strong>{session.configured ? `${session.provider?.toUpperCase()} KEY STORED` : "RESEARCH SERVICE"}</strong><span>{sessionError || (session.configured ? `Model: ${session.model || "not selected"}` : "Configure a temporary provider key for grounded synthesis")}</span><button type="button" onClick={openSettings} aria-label="Open API key settings"><LockKeyhole size={16} /></button></div>
        <div className="h89-ai-messages" aria-live="polite">
          {messages.length === 0 && <div className="h89-ai-welcome"><Sparkles size={27} /><span>INTELLIGENCE / SOURCE IMPORT PENDING</span><h2>Begin with a question.</h2><p>NASA source import is pending. The assistant identifies missing evidence instead of inventing mission facts. Your selected mission and region are included as context.</p><div className="h89-ai-suggestions">{questions.map((q) => <button type="button" key={q} onClick={() => void send(q)}>{q}<span>↗</span></button>)}</div></div>}
          {messages.map((item) => <article className={`h89-ai-message h89-ai-${item.role}`} key={item.id}><div className="h89-ai-message-role">{item.role === "assistant" ? "HORIZON INTELLIGENCE" : "YOU"}</div><p>{item.text}</p>{Boolean(item.citations?.length) && <div className="h89-ai-citations"><strong>Sources</strong>{item.citations?.map((cite, index) => <a href={cite.url} target="_blank" rel="noopener noreferrer" key={`${cite.url}-${index}`}>{cite.title}<span>↗</span>{cite.description && <small>{cite.description}</small>}</a>)}</div>}</article>)}
          {loading && <div className="h89-ai-thinking" role="status">Reviewing available evidence…</div>}
          <div ref={endRef} />
        </div>
        <form className="h89-ai-composer" onSubmit={onSubmit}><label htmlFor="h89-ai-prompt">Ask Horizon Intelligence</label><textarea id="h89-ai-prompt" maxLength={2000} rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(draft); } }} placeholder="Ask about lunar missions, sources, or the current view…" /><div><span>Shift + Enter for a new line · type API KEY for secure settings</span><button type="submit" disabled={!draft.trim() || loading}>Send <Send size={15} /></button></div></form>
      </div>

      <aside className="h89-ai-aside"><span className="h89-ai-kicker">ACTIVE CONTEXT</span><h2>What the assistant can see</h2><div className="h89-ai-contextitem"><span>WORKSPACE</span><strong>{context.section}</strong></div><div className="h89-ai-contextitem"><span>MISSION</span><strong>{context.selectedMission || "None selected"}</strong></div><div className="h89-ai-contextitem"><span>REGION</span><strong>{context.selectedRegion || "None selected"}</strong></div><div className="h89-ai-contextitem"><span>COORDINATES</span><strong>{context.selectedCoordinates || "None selected"}</strong></div><div className="h89-ai-context-note"><ShieldCheck size={20} /><p>The backend receives only this view context and your question. Answers should cite available source records and identify missing evidence.</p></div><button type="button" className="h89-ai-settings" onClick={openSettings}><KeyRound size={16} /> Configure temporary API key <ChevronDown size={15} /></button></aside>
    </div>

    {modalOpen && <div className="h89-ai-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSettings(); }}><div className="h89-ai-modal" role="dialog" aria-modal="true" aria-labelledby="h89-ai-modal-title"><header><div className="h89-ai-modal-icon"><LockKeyhole size={21} /></div><div><span className="h89-ai-kicker">PRIVATE SESSION CONFIGURATION</span><h2 id="h89-ai-modal-title">Connect a provider</h2></div><button type="button" aria-label="Close settings" onClick={closeSettings}><X size={19} /></button></header><p className="h89-ai-modal-intro">Your key is sent to the local backend and held in server memory for this browser session. It is never written to chat history or browser storage. Use HTTPS when deployed beyond localhost.</p><label htmlFor="h89-ai-provider">Provider</label><select id="h89-ai-provider" value={provider} onChange={(event) => selectProvider(event.target.value as Provider)}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select><label htmlFor="h89-ai-key">API key</label><div className="h89-ai-keyrow"><input id="h89-ai-key" autoComplete="off" spellCheck={false} type={showKey ? "text" : "password"} value={key} onChange={(event) => setKey(event.target.value)} placeholder={session.configured ? "Saved for this session · enter to replace" : "Enter your provider key"} /><button type="button" aria-label={showKey ? "Hide API key" : "Show API key"} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><button className="h89-ai-test" type="button" onClick={() => void testConnection()} disabled={configBusy}>{configBusy ? "Checking…" : "Test connection and discover models"}</button><label htmlFor="h89-ai-model">Model</label><select id="h89-ai-model" value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length}><option value="">{models.length ? "Select a compatible model" : "Test connection to discover models"}</option>{models.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || entry.id}</option>)}</select>{configError && <p className="h89-ai-config-error" role="alert">{configError}</p>}{configMessage && <p className="h89-ai-config-success" role="status"><Check size={16} />{configMessage}</p>}<footer><button type="button" onClick={() => void clearSession()} disabled={configBusy || !session.configured}>Clear credential</button><span /><button type="button" onClick={closeSettings}>Cancel</button><button type="button" className="h89-ai-save" onClick={() => void saveSession()} disabled={configBusy || (!key && !session.configured)}>Save for this session</button></footer></div></div>}
  </section>;
}
