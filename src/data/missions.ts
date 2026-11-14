/**
 * Research leads, not a verified or complete CLPS catalogue.
 * The names below come from the product brief. NASA's official pages could not be
 * fetched in this environment (proxy CONNECT 403 on 2026-11-12). No coordinates,
 * dates, payload counts, outcomes, or task-order identifiers are inferred.
 */

export type EvidenceState = "verified" | "pending";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  state: EvidenceState;
  verifiedAt: string | null;
  accessNote: string;
};

export type MissionEvent = {
  id: string;
  date: string;
  dateKind: "actual" | "planned";
  title: string;
  sourceId: string;
};

export type Mission = {
  id: string;
  name: string;
  provider: string;
  lander: string | null;
  taskOrder: string | null;
  status: string | null;
  outcome: string | null;
  destination: string | null;
  coordinates: { latitude: number; longitude: number; sourceId: string } | null;
  payloads: readonly string[];
  events: readonly MissionEvent[];
  objective: string | null;
  evidenceState: EvidenceState;
  verifiedAt: string | null;
  sourceIds: readonly string[];
};

export const sources: readonly Source[] = [
  {
    id: "nasa-deliveries",
    title: "Commercial Lunar Payload Services deliveries",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/clps-deliveries/",
    state: "pending",
    verifiedAt: null,
    accessNote: "Official page could not be fetched: proxy CONNECT 403 on 2026-11-12.",
  },
  {
    id: "nasa-providers",
    title: "CLPS providers",
    publisher: "NASA",
    url: "https://www.nasa.gov/commercial-lunar-payload-services/clps-providers/",
    state: "pending",
    verifiedAt: null,
    accessNote: "Official source is listed for later verification; it has not been read in this session.",
  },
  {
    id: "nasa-reference",
    title: "Commercial Lunar Payload Services reference",
    publisher: "NASA",
    url: "https://www.nasa.gov/reference/commercial-lunar-payload-services/",
    state: "pending",
    verifiedAt: null,
    accessNote: "Official source is listed for later verification; it has not been read in this session.",
  },
  {
    id: "nasa-science",
    title: "Commercial Lunar Payload Services science program",
    publisher: "NASA Science",
    url: "https://science.nasa.gov/lunar-science/programs/clps/",
    state: "pending",
    verifiedAt: null,
    accessNote: "Official page could not be fetched: proxy CONNECT 403 on 2026-11-12.",
  },
];

// These entries are explicitly unverified research leads supplied in the brief.
// Unknown fields remain null, and absence of events is not an assertion that
// no launch, landing, or science operation occurred.
const lead = (id: string, name: string, provider: string, lander: string | null = null): Mission => ({
  id,
  name,
  provider,
  lander,
  taskOrder: null,
  status: null,
  outcome: null,
  destination: null,
  coordinates: null,
  payloads: [],
  events: [],
  objective: null,
  evidenceState: "pending",
  verifiedAt: null,
  sourceIds: ["nasa-deliveries", "nasa-science"],
});

export const missions: readonly Mission[] = [
  lead("peregrine-1", "Peregrine Mission One", "Astrobotic", "Peregrine"),
  lead("griffin-1", "Griffin Mission One", "Astrobotic", "Griffin"),
  lead("im-1", "IM-1 / Odysseus", "Intuitive Machines", "Odysseus"),
  lead("im-2", "IM-2 / Athena", "Intuitive Machines", "Athena"),
  lead("im-3", "IM-3", "Intuitive Machines"),
  lead("im-4", "IM-4", "Intuitive Machines"),
  lead("blue-ghost-1", "Blue Ghost Mission 1", "Firefly Aerospace", "Blue Ghost"),
  lead("blue-ghost-2", "Blue Ghost Mission 2", "Firefly Aerospace", "Blue Ghost"),
  lead("apex-1", "APEX 1.0", "Draper / ispace-U.S."),
  lead("blue-moon-mk1", "Blue Moon Mark 1", "Blue Origin", "Blue Moon"),
];

export const missionById = (id: string): Mission | undefined => missions.find((mission) => mission.id === id);
export const sourceById = (id: string): Source | undefined => sources.find((source) => source.id === id);
