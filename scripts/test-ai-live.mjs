// Optional real-service smoke. No placeholder key or scripted response is supplied.
if (!process.env.GROQ_API_KEY) {
  console.log(
    "SKIPPED: GROQ_API_KEY is not configured; no real AI request was made.",
  );
  process.exit(0);
}
const base = process.env.H89_API_BASE_URL ?? "http://127.0.0.1:3001";
const health = await (
  await fetch(base + "/api/health", { signal: AbortSignal.timeout(5000) })
).json();
if (!health.copilotConfigured)
  throw new Error(
    "Backend reports no AI key. Start it with the same secure environment before testing.",
  );
const response = await fetch(base + "/api/copilot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: AbortSignal.timeout(25000),
  body: JSON.stringify({
    question:
      "Compare IM-1 and Peregrine using the provided historical catalog. Distinguish known outcomes from missing measurements and cite a provided source.",
    missionId: "im1",
    compareMissionIds: ["im1", "peregrine"],
    site: { latitude: -89, longitude: 0 },
    timeUTC: "2025-03-02T06:00:00.000Z",
    history: [],
  }),
});
const data = await response.json();
if (!response.ok) throw new Error(data.error ?? `AI HTTP ${response.status}`);
if (
  typeof data.answer !== "string" ||
  !data.answer.trim() ||
  !data.source?.includes("AI generated")
)
  throw new Error("Invalid AI response");
console.log(
  JSON.stringify(
    {
      status: "real-response-received",
      characters: data.answer.length,
      sourceReferences: data.sources?.length ?? 0,
      limitation:
        "Transport smoke only; inspect source grounding and answer quality separately. No key or generated answer printed.",
    },
    null,
    2,
  ),
);
