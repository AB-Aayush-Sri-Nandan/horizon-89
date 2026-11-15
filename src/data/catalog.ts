export type DataStatus =
  "historical" | "calculated" | "simulation" | "unavailable";
export interface Source {
  name: string;
  url: string;
  asOf: string;
  accessedOn?: string | null;
}
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface MissionEvent {
  date: string;
  title: string;
  description: string;
}
export interface LandingCoordinateEvidence {
  referenceFrame: string;
  datum: string;
  radiusM: number | null;
  accessedOn: string;
  kind: "as-landed";
  convention: "planetocentric / east-positive";
  sourceUrl: string;
  publishedOn: string;
  reviewedOn: string;
  precisionDegrees: number;
  uncertaintyM: number | null;
}
export interface Mission {
  id: string;
  name: string;
  provider: string;
  destination: string;
  description: string;
  status: string;
  coordinates: Coordinates | null;
  coordinateEvidence: LandingCoordinateEvidence | null;
  landingOutcome: "landed" | "no-landing" | "planned";
  resultsNote: string;
  coordinateNote: string;
  payloads: string[];
  events: MissionEvent[];
  source: Source;
}
const plannedMission = (id: string, name: string, provider: string, destination: string): Mission => ({
  id,
  name,
  provider,
  destination,
  description: "Planned commercial lunar delivery. Schedule, payload manifest and landing site require official revalidation before operational use.",
  status: "Planned · revalidation required",
  coordinates: null,
  coordinateEvidence: null,
  landingOutcome: "planned",
  resultsNote: "No flight outcome exists in this historical catalogue.",
  coordinateNote: "A planned destination is not an as-landed coordinate; no marker is displayed.",
  payloads: [],
  events: [],
  source: { name: "NASA · Commercial Lunar Payload Services", url: "https://www.nasa.gov/commercial-lunar-payload-services/", asOf: "2026-11-15" },
});
// Historical snapshot: never inferred to be a current operational status.
export const missions: Mission[] = [
  {
    id: "im1",
    name: "IM-1 · Odysseus",
    provider: "Intuitive Machines",
    destination: "Malapert A · South polar region",
    description:
      "First CLPS delivery to reach the lunar surface. NASA payloads investigated plume–surface interactions, navigation and radio astronomy.",
    status: "Landed · historical",
    coordinates: { latitude: -80.13, longitude: 1.44 },
    coordinateEvidence: {
      referenceFrame: "Mean Earth / polar axis",
      datum: "Lunar mean radius",
      radiusM: 1737400,
      accessedOn: "2026-11-15",
      kind: "as-landed",
      convention: "planetocentric / east-positive",
      sourceUrl: "https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/",
      publishedOn: "2024-02-27",
      reviewedOn: "2026-11-15",
      precisionDegrees: 0.01,
      uncertaintyM: null,
    },
    landingOutcome: "landed",
    resultsNote:
      "No independently reviewed scientific-results product is linked in this catalog.",
    coordinateNote: "80.13° S, 1.44° E from NASA LRO image analysis.",
    payloads: [
      "Navigation Doppler Lidar",
      "Lunar Node-1 navigation demonstrator",
      "Radio wave observations at the lunar surface",
    ],
    events: [
      {
        date: "2024-02-15",
        title: "Launch",
        description: "Launched aboard a Falcon 9.",
      },
      {
        date: "2024-02-22",
        title: "Lunar landing",
        description: "Odysseus reached the lunar surface near Malapert A.",
      },
    ],
    source: {
      name: "NASA · Intuitive Machines IM-1",
      url: "https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/",
      asOf: "2024-02-23",
    },
  },
  {
    id: "blue-ghost",
    name: "Blue Ghost Mission 1",
    provider: "Firefly Aerospace",
    destination: "Mare Crisium · Near side",
    description:
      "A CLPS delivery carrying ten NASA science and technology instruments to Mare Crisium, including subsurface and dust investigations.",
    status: "Landed · historical",
    coordinates: { latitude: 18.56, longitude: 61.81 },
    coordinateEvidence: {
      referenceFrame: "Lunar body-fixed",
      datum: "Provider-published landing coordinate",
      radiusM: null,
      accessedOn: "2026-11-15",
      kind: "as-landed",
      convention: "planetocentric / east-positive",
      sourceUrl: "https://fireflyspace.com/missions/blue-ghost-mission-1/",
      publishedOn: "2025-03-02",
      reviewedOn: "2026-11-15",
      precisionDegrees: 0.01,
      uncertaintyM: null,
    },
    landingOutcome: "landed",
    resultsNote:
      "No independently reviewed scientific-results product is linked in this catalog.",
    coordinateNote: "18.56° N, 61.81° E · provider-published coordinate; not independently surveyed here.",
    payloads: [
      "Lunar Instrumentation for Subsurface Thermal Exploration with Rapidity (LISTER)",
      "Electrodynamic Dust Shield",
      "Lunar Magnetotelluric Sounder",
    ],
    events: [
      {
        date: "2025-01-15",
        title: "Launch",
        description: "Blue Ghost began its journey to the Moon.",
      },
      {
        date: "2025-03-02",
        title: "Lunar landing",
        description: "Blue Ghost landed in Mare Crisium.",
      },
    ],
    source: {
      name: "NASA · Blue Ghost Mission 1",
      url: "https://www.nasa.gov/missions/artemis/clps/",
      asOf: "2025-03-02",
    },
  },
  {
    id: "peregrine",
    name: "Peregrine Mission One",
    provider: "Astrobotic",
    destination: "No lunar landing",
    description:
      "The first CLPS launch carried NASA investigations. A propulsion anomaly prevented a lunar landing; the spacecraft returned to Earth’s atmosphere.",
    status: "Mission ended · historical",
    coordinates: null,
    coordinateEvidence: null,
    landingOutcome: "no-landing",
    resultsNote:
      "No independently reviewed scientific-results product is linked in this catalog.",
    coordinateNote: "No landing occurred. No surface marker is displayed.",
    payloads: [
      "Near-Infrared Volatile Spectrometer System",
      "Neutron Spectrometer System",
      "Peregrine Ion-Trap Mass Spectrometer",
    ],
    events: [
      {
        date: "2024-01-08",
        title: "Launch",
        description: "Launched on the first Vulcan flight.",
      },
      {
        date: "2024-01-18",
        title: "Mission ended",
        description: "Peregrine reentered Earth’s atmosphere.",
      },
    ],
    source: {
      name: "NASA · Astrobotic Peregrine",
      url: "https://www.nasa.gov/missions/artemis/clps/",
      asOf: "2024-01-19",
    },
  },
  plannedMission("griffin-1", "Griffin Mission One", "Astrobotic", "Lunar south polar region"),
  {
    id: "im-2",
    name: "IM-2 · Athena",
    provider: "Intuitive Machines",
    destination: "Mons Mouton region · lunar south pole",
    description: "Athena carried NASA technology demonstrations including the PRIME-1 drill toward the lunar south polar region.",
    status: "Landed · historical",
    coordinates: null,
    coordinateEvidence: null,
    landingOutcome: "landed",
    resultsNote: "NASA reported limited surface operations; the reviewed source does not establish a precise coordinate.",
    coordinateNote: "South-pole landing reported by NASA; no exact marker is shown without a reviewed coordinate source.",
    payloads: ["PRIME-1 drill", "Mass Spectrometer observing lunar operations", "Laser Retroreflector Array"],
    events: [{ date: "2025-02-26", title: "Launch", description: "Athena launched toward the Moon." }, { date: "2025-03-06", title: "Lunar landing", description: "NASA reported landing near the lunar south pole." }],
    source: { name: "NASA · IM-2 Athena", url: "https://www.nasa.gov/blogs/missions/2025/03/06/intuitive-machines-mission-lands-near-south-pole-carrying-nasa-science/", asOf: "2025-03-06", accessedOn: "2026-11-15" },
  },
  plannedMission("im-3", "IM-3", "Intuitive Machines", "Reiner Gamma region"),
  plannedMission("im-4", "IM-4", "Intuitive Machines", "Lunar south polar region"),
  plannedMission("blue-ghost-2", "Blue Ghost Mission 2", "Firefly Aerospace", "Far side of the Moon"),
  plannedMission("apex-1", "APEX 1.0", "Draper / ispace-U.S.", "Schrödinger Basin"),
  plannedMission("blue-moon-mk1", "Blue Moon Mark 1", "Blue Origin", "Lunar south polar region"),
];
export interface Dataset {
  id: string;
  name: string;
  available: boolean;
  kind: string;
  description: string;
  url: string;
}
export const datasets: Dataset[] = [
  {
    id: "imagery",
    name: "Lunar global image map",
    available: true,
    kind: "Imagery · 1024 × 512",
    description:
      "Bundled Three.js Moon example image. Qualitative surface context only; original acquisition metadata is not supplied upstream. Not a certified LRO mosaic or elevation model.",
    url: "https://github.com/mrdoob/three.js/blob/master/examples/textures/planets/moon_1024.jpg",
  },
  {
    id: "horizons",
    name: "JPL Horizons observer geometry",
    available: true,
    kind: "Remote calculated ephemerides",
    description:
      "Server integration for Sun and Earth azimuth/elevation at a lunar surface observer. Requires network access; no offline values are fabricated.",
    url: "https://ssd.jpl.nasa.gov/horizons/manual.html",
  },
  {
    id: "lola",
    name: "LOLA topography & slope",
    available: false,
    kind: "Elevation dataset not integrated",
    description:
      "No georeferenced elevation tiles exist in this checkout. Slope, terrain occlusion and accessibility cannot be evaluated.",
    url: "https://lola.gsfc.nasa.gov/",
  },
  {
    id: "psr",
    name: "Permanently shadowed regions",
    available: false,
    kind: "No verified mask",
    description:
      "A single low Sun angle does not establish permanent shadow or the presence of ice.",
    url: "https://science.nasa.gov/moon/exploration/",
  },
];
export interface SolarBody {
  name: string;
  radius: number;
  orbit: number;
  color: string;
  period: number;
  fact: string;
  source: string;
}
export const solarBodies: SolarBody[] = [
  {
    name: "Sun",
    radius: 1.2,
    orbit: 0,
    color: "#ffd98c",
    period: 0,
    fact: "Our star contains most of the mass in the Solar System.",
    source: "https://science.nasa.gov/sun/",
  },
  {
    name: "Mercury",
    radius: 0.17,
    orbit: 2,
    color: "#aaa39b",
    period: 87.97,
    fact: "The smallest planet and the closest to the Sun.",
    source: "https://science.nasa.gov/mercury/",
  },
  {
    name: "Venus",
    radius: 0.28,
    orbit: 3,
    color: "#d8bb88",
    period: 224.7,
    fact: "A thick carbon dioxide atmosphere traps heat at the surface.",
    source: "https://science.nasa.gov/venus/",
  },
  {
    name: "Earth",
    radius: 0.3,
    orbit: 4,
    color: "#69a8d2",
    period: 365.26,
    fact: "Our ocean world has one natural satellite, the Moon.",
    source: "https://science.nasa.gov/earth/",
  },
  {
    name: "Moon",
    radius: 0.09,
    orbit: 4,
    color: "#b6b6b6",
    period: 27.32,
    fact: "Earth’s natural satellite. Its orbit is shown enlarged here.",
    source: "https://science.nasa.gov/moon/",
  },
  {
    name: "Mars",
    radius: 0.23,
    orbit: 5,
    color: "#c47755",
    period: 686.98,
    fact: "Iron minerals oxidize to give Mars its red appearance.",
    source: "https://science.nasa.gov/mars/",
  },
  {
    name: "Jupiter",
    radius: 0.72,
    orbit: 6.7,
    color: "#c4a58b",
    period: 4332.59,
    fact: "The largest planet is a gas giant with a turbulent atmosphere.",
    source: "https://science.nasa.gov/jupiter/",
  },
  {
    name: "Saturn",
    radius: 0.6,
    orbit: 8.8,
    color: "#dfcc9b",
    period: 10759.22,
    fact: "Its broad rings are made mostly of water ice particles.",
    source: "https://science.nasa.gov/saturn/",
  },
  {
    name: "Uranus",
    radius: 0.43,
    orbit: 10.8,
    color: "#9fd6de",
    period: 30688.5,
    fact: "This ice giant rotates on its side relative to its orbit.",
    source: "https://science.nasa.gov/uranus/",
  },
  {
    name: "Neptune",
    radius: 0.42,
    orbit: 12.6,
    color: "#5478d8",
    period: 60182,
    fact: "The most distant planet has powerful atmospheric winds.",
    source: "https://science.nasa.gov/neptune/",
  },
];

/** A destination name or planned target must never create an as-landed marker. */
export function missionCoordinates(mission: Mission): Coordinates | null {
  const c = mission.coordinates,
    e = mission.coordinateEvidence;
  if (
    mission.landingOutcome !== "landed" ||
    !c ||
    !e ||
    e.kind !== "as-landed" ||
    e.convention !== "planetocentric / east-positive"
  )
    return null;
  if (
    ![c.latitude, c.longitude].every(Number.isFinite) ||
    Math.abs(c.latitude) > 90 ||
    Math.abs(c.longitude) > 180 ||
    !Number.isFinite(e.precisionDegrees) ||
    e.precisionDegrees <= 0 ||
    (e.uncertaintyM !== null &&
      (!Number.isFinite(e.uncertaintyM) || e.uncertaintyM < 0))
  )
    return null;
  if (
    !/^https:\/\//.test(e.sourceUrl) ||
    ![e.publishedOn, e.reviewedOn].every(
      (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)),
    )
  )
    return null;
  if (
    !e.referenceFrame?.trim() ||
    !e.datum?.trim() ||
    (e.radiusM !== null &&
      (!Number.isFinite(e.radiusM) ||
        e.radiusM < 1700000 ||
        e.radiusM > 1800000))
  )
    return null;
  for (const date of [e.publishedOn, e.reviewedOn, e.accessedOn])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      return null;
  try {
    const url = new URL(e.sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
  } catch {
    return null;
  }
  return c;
}
