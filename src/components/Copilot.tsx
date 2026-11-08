import { missions, type Coordinates } from "../data/catalog";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { requestJSON } from "../services/horizons";
interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { name: string; url: string }[];
}
export default function Copilot({
  missionId,
  solarBody,
  site,
  timeUTC,
}: {
  missionId: string;
  solarBody: string | null;
  site: Coordinates | null;
  timeUTC: string;
}) {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [history, setHistory] = useState<Message[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [compareId, setCompareId] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(question: string) {
    if (!question.trim() || busy) return;
    const message = question.trim();
    setInput("");
    setError("");
    setBusy(true);
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 24000);
    try {
      const result = await requestJSON<{
        answer: string;
        sources?: { name: string; url: string }[];
      }>("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.current.signal,
        body: JSON.stringify({
          question: message,
          missionId,
          compareMissionIds: [
            ...new Set(
              [missionId, compareId].filter((id) =>
                missions.some((m) => m.id === id),
              ),
            ),
          ],
          solarBody,
          site,
          timeUTC,
          history: history.slice(-6),
        }),
      });
      setHistory(
        (current) =>
          [
            ...current,
            { role: "user", content: message },
            {
              role: "assistant",
              content: result.answer,
              sources: result.sources,
            },
          ].slice(-12) as Message[],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot unavailable");
      setInput(message);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="copilot-toggle"
        aria-label="Mission Copilot"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bot size={18} /> <span className="copilot-label">Mission Copilot</span>{" "}
        <span className="badge">AI</span>
      </button>
      {open && (
        <section className="copilot panel" aria-label="Mission Copilot">
          <header className="row">
            <div>
              <span className="eyebrow">CONTEXTUAL ASSISTANCE</span>
              <h2>Mission Copilot</h2>
            </div>
            <button aria-label="Close Copilot" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <p className="muted">
            Selected catalog, science availability and simulation UTC are sent
            with your question. AI answers require a server key and should be
            checked against sources.
          </p>
          <div className="chat-history" aria-live="polite">
            {history.map((message, i) => (
              <div className={`chat ${message.role}`} key={i}>
                <span className="eyebrow">
                  {message.role === "user" ? "YOU" : "AI GENERATED"}
                </span>
                <p>{message.content}</p>
                {message.sources?.map((source) => (
                  <a
                    key={source.url + source.name}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.name} ↗
                  </a>
                ))}
                {message.role === "assistant" && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(message.content);
                        setCopied(true);
                      } catch {
                        setError(
                          "Clipboard access is unavailable. Select the response text to copy.",
                        );
                      }
                    }}
                  >
                    Copy response
                  </button>
                )}
              </div>
            ))}
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            {busy && <p role="status">Requesting grounded assistance…</p>}
          </div>
          {copied && <p role="status">Response copied.</p>}
          <label>
            Comparison context
            <select
              aria-label="Copilot comparison mission"
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
            >
              <option value="">No second mission</option>
              {missions
                .filter((m) => m.id !== missionId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="chips">
            {[
              "Explain this mission",
              "What datasets are missing?",
              "Explain terrain versus flat-horizon visibility",
              ...(compareId ? ["Compare the selected missions"] : []),
            ].map((q) => (
              <button key={q} disabled={busy} onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="copilot-form"
          >
            <label className="sr-only" htmlFor="copilot-input">
              Ask Copilot
            </label>
            <input
              id="copilot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1500}
              placeholder="Ask about this mission…"
              disabled={busy}
            />
            <button disabled={busy || !input.trim()} aria-label="Send question">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
