export type EvidenceState = "verified" | "partial" | "pending";

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
  title: string;
  dateKind: "actual" | "planned";
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
  coordinates: { latitude: number; longitude: number; confidence: "NASA-verified" | "provider-published" } | null;
  payloads: string[];
  events: MissionEvent[];
  objective: string | null;
  evidenceState: EvidenceState;
  verifiedAt: string | null;
  sourceIds: string[];
};

export const sources: Source[] = [
  { id: "nasa-im1-lro", title: "NASA's LRO Images Intuitive Machines' Odysseus Lander", publisher: "NASA", url: "https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA page reviewed. Coordinates, elevation and local slope are reported from LROC analysis." },
  { id: "nasa-im1-science", title: "NASA Collects First Surface Science in Decades via Commercial Moon Mission", publisher: "NASA", url: "https://www.nasa.gov/missions/artemis/clps/nasa-collects-first-surface-science-in-decades-via-commercial-moon-mission/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA mission summary reviewed." },
  { id: "nasa-blueghost", title: "NASA Science Touches Down on Moon Aboard Firefly Aerospace Lander", publisher: "NASA", url: "https://www.nasa.gov/blogs/missions/2025/03/02/nasa-science-touches-down-on-moon-aboard-firefly-aerospace-lander/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA landing report reviewed." },
  { id: "nasa-blueghost-payloads", title: "Ten NASA Science, Tech Instruments Flying to Moon on Firefly Lander", publisher: "NASA", url: "https://www.nasa.gov/missions/artemis/clps/ten-nasa-science-tech-instruments-flying-to-moon-on-firefly-lander/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA payload and target-region article reviewed." },
  { id: "nasa-im2", title: "Intuitive Machines Mission Lands Near South Pole Carrying NASA Science", publisher: "NASA", url: "https://www.nasa.gov/blogs/missions/2025/03/06/intuitive-machines-mission-lands-near-south-pole-carrying-nasa-science/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA landing report reviewed; this source does not establish precise coordinates." },
  { id: "nasa-peregrine", title: "Astrobotic Peregrine Mission One", publisher: "NASA", url: "https://www.nasa.gov/missions/artemis/clps/astrobotic-peregrine-mission-one/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA mission page reviewed. Peregrine did not land on the Moon." },
  { id: "nasa-peregrine-end", title: "NASA Science, Astrobotic Peregrine Mission One Concludes", publisher: "NASA", url: "https://www.nasa.gov/news-release/nasa-science-astrobotic-peregrine-mission-one-concludes/", state: "verified", verifiedAt: "2026-11-15", accessNote: "NASA conclusion report reviewed." },
  { id: "nasa-clps", title: "Commercial Lunar Payload Services", publisher: "NASA", url: "https://www.nasa.gov/commercial-lunar-payload-services/", state: "partial", verifiedAt: "2026-11-15", accessNote: "Official programme reference. Future mission details can change and require revalidation." },
];

const pending = (id: string, name: string, provider: string, lander: string | null, destination: string | null): Mission => ({
  id, name, provider, lander, taskOrder: null, status: "Planned / schedule requires revalidation", outcome: null, destination, coordinates: null,
  payloads: [], events: [], objective: "Official mission detail review is still required.", evidenceState: "pending", verifiedAt: null, sourceIds: ["nasa-clps"],
});

export const missions: Mission[] = [
  {
    id: "im-1", name: "IM-1 / Odysseus", provider: "Intuitive Machines", lander: "Odysseus", taskOrder: "TO2-IM",
    status: "Completed", outcome: "Landed 22 February 2024; operated for seven days", destination: "Malapert A region",
    coordinates: { latitude: -80.13, longitude: 1.44, confidence: "NASA-verified" },
    payloads: ["Navigation Doppler Lidar", "Lunar Node-1", "Radio-wave Observation at the Lunar Surface of the photo-Electron Sheath", "Stereo Cameras for Lunar Plume-Surface Studies", "Laser Retroreflector Array", "Radio Frequency Mass Gauge"],
    events: [{ id: "im1-launch", date: "2024-02-15", title: "Launch", dateKind: "actual" }, { id: "im1-land", date: "2024-02-22", title: "Lunar landing", dateKind: "actual" }],
    objective: "Deliver NASA instruments and demonstrate commercial lunar-surface operations.", evidenceState: "verified", verifiedAt: "2026-11-15", sourceIds: ["nasa-im1-lro", "nasa-im1-science"],
  },
  {
    id: "blue-ghost-1", name: "Blue Ghost Mission 1", provider: "Firefly Aerospace", lander: "Blue Ghost", taskOrder: "19D",
    status: "Completed", outcome: "Landed 2 March 2025", destination: "Mons Latreille, Mare Crisium",
    coordinates: { latitude: 18.56, longitude: 61.81, confidence: "provider-published" },
    payloads: ["Lunar GNSS Receiver Experiment", "Electrodynamic Dust Shield", "Lunar Environment heliospheric X-ray Imager", "Lunar Magnetotelluric Sounder", "Next Generation Lunar Retroreflector", "Regolith Adherence Characterization", "Radiation Tolerant Computer", "Lunar PlanetVac", "Stereo Cameras for Lunar Plume-Surface Studies", "Lunar Instrumentation for Subsurface Thermal Exploration with Rapidity"],
    events: [{ id: "bg1-launch", date: "2025-01-15", title: "Launch", dateKind: "actual" }, { id: "bg1-land", date: "2025-03-02", title: "Lunar landing", dateKind: "actual" }],
    objective: "Deliver ten NASA science and technology instruments to Mare Crisium.", evidenceState: "partial", verifiedAt: "2026-11-15", sourceIds: ["nasa-blueghost", "nasa-blueghost-payloads"],
  },
  {
    id: "im-2", name: "IM-2 / Athena", provider: "Intuitive Machines", lander: "Athena", taskOrder: "TO PRIME-1",
    status: "Completed", outcome: "Landed 6 March 2025; mission ended after limited surface operations", destination: "Mons Mouton region, lunar south pole",
    coordinates: null, payloads: ["PRIME-1 drill", "Mass Spectrometer observing lunar operations", "Laser Retroreflector Array"],
    events: [{ id: "im2-launch", date: "2025-02-26", title: "Launch", dateKind: "actual" }, { id: "im2-land", date: "2025-03-06", title: "Lunar landing", dateKind: "actual" }],
    objective: "Demonstrate drilling and volatile analysis near the lunar south pole.", evidenceState: "partial", verifiedAt: "2026-11-15", sourceIds: ["nasa-im2"],
  },
  {
    id: "peregrine-1", name: "Peregrine Mission One", provider: "Astrobotic", lander: "Peregrine", taskOrder: "TO2-AB",
    status: "Completed", outcome: "Did not reach the Moon; safely re-entered over the South Pacific", destination: "No lunar landing",
    coordinates: null, payloads: ["Laser Retroreflector Array", "Linear Energy Transfer Spectrometer", "Near-Infrared Volatile Spectrometer System", "Neutron Spectrometer System", "Peregrine Ion-Trap Mass Spectrometer"],
    events: [{ id: "pm1-launch", date: "2024-01-08", title: "Launch", dateKind: "actual" }, { id: "pm1-end", date: "2024-01-18", title: "Controlled Earth re-entry", dateKind: "actual" }],
    objective: "Deliver NASA science payloads to the lunar surface; the landing was not achieved.", evidenceState: "verified", verifiedAt: "2026-11-15", sourceIds: ["nasa-peregrine", "nasa-peregrine-end"],
  },
  pending("griffin-1", "Griffin Mission One", "Astrobotic", "Griffin", "Lunar south polar region"),
  pending("im-3", "IM-3", "Intuitive Machines", "Nova-C", "Reiner Gamma region"),
  pending("im-4", "IM-4", "Intuitive Machines", "Nova-C", "Lunar south polar region"),
  pending("blue-ghost-2", "Blue Ghost Mission 2", "Firefly Aerospace", "Blue Ghost", "Far side of the Moon"),
  pending("apex-1", "APEX 1.0", "Draper / ispace-U.S.", "APEX 1.0", "Schrodinger Basin"),
  pending("blue-moon-mk1", "Blue Moon Mark 1", "Blue Origin", "Blue Moon", "Lunar south polar region"),
];

export const missionById = (id?: string) => missions.find((mission) => mission.id === id);
export const sourceById = (id: string) => sources.find((source) => source.id === id);
