import { missions, type Coordinates } from "../data/catalog";
import { useEffect, useRef, useState, useCallback } from "react";
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
  const trigger = useRef<HTMLButtonElement>(null),
    inputField = useRef<HTMLInputElement>(null),
    wasOpen = useRef(false);
  const [configuration, setConfiguration] = useState("checking");
  useEffect(() => {
    if (open && !busy) inputField.current?.focus();
    else if (!open && wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open, busy]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const health = new AbortController();
    requestJSON<{ copilotKeyPresent: boolean }>("/api/health", {
      signal: AbortSignal.any([health.signal, AbortSignal.timeout(5000)]),
    })
      .then((data) => {
        if (active)
          setConfiguration(
            data.copilotKeyPresent ? "configured" : "unconfigured",
          );
      })
      .catch(() => {
        if (active) setConfiguration("unreachable");
      });
    return () => {
      active = false;
      health.abort();
    };
  }, [open]);
  const close = useCallback(() => {
    controller.current?.abort();
    setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      )
        close();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, close]);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(question: string) {
    if (!question.trim() || busy) return;
    const message = question.trim();
    setInput("");
    setError("");
    setCopied(false);
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
        ref={trigger}
        className="copilot-toggle"
        aria-label="Mission Copilot"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Bot size={18} /> <span className="copilot-label">Mission Copilot</span>{" "}
        <span className="badge">AI</span>
      </button>
      {open && (
        <section
          className="copilot panel"
          aria-label="Mission Copilot"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
        >
          <header className="row">
            <div>
              <span className="eyebrow">CONTEXTUAL ASSISTANCE</span>
              <h2>Mission Copilot</h2>
            </div>
            <button aria-label="Close Copilot" onClick={close}>
              <X size={18} />
            </button>
          </header>
          <p className="muted">
            Selected catalog, science availability and simulation UTC are sent
            with your question. AI answers require a server key and should be
            checked against sources.
          </p>
          <p className="notice copilot-configuration" role="status">
            {configuration === "unconfigured"
              ? "Copilot is not configured. Mission history, imagery and source panels work without AI. No generated answer is available."
              : configuration === "configured"
                ? "Server key present; provider access is unverified until a real answer succeeds."
                : configuration === "unreachable"
                  ? "Could not check Copilot configuration. The API may be unavailable; the local explorer remains usable."
                  : "Checking server configuration…"}
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
              ref={inputField}
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
