import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  OrbitControls,
  Stars,
} from "@react-three/drei";

import {
  Activity,
  Bot,
  ChevronDown,
  Copy,
  Crosshair,
  Cpu,
  LocateFixed,
  MapPin,
  Pause,
  Play,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import * as THREE from "three";
import { MoonModel, type TextureStatus } from "./components/MoonModel";
import { validateAltitude, validateSiteTime } from "../shared/validation";
import { formatAngle, adaptLegacyHorizons } from "./science/horizons";

import {
  getLunarGeometry,
  type HorizonsGeometryResponse,
} from "./services/horizons";

type Quality =
  | "low"
  | "medium"
  | "high";

type MissionSite = {
  id: string;
  provider: string;
  name: string;
  status: string;
  lat: number | null;
  lon: number | null;
  altitudeKm?: number;
  note: string;
};


const initialSites: MissionSite[] = [
  {
    id: "manual",
    provider: "HORIZON 89",
    name: "Manual South-Pole Target",
    status: "DEMO",
    lat: -89,
    lon: 0,
    note:
      "Demo coordinate used only for interface testing.",
  },

  {
    id: "mission-2",
    provider: "CLPS DATA",
    name: "Mission Site Unavailable",
    status: "UNSOURCED",
    lat: null,
    lon: null,
    note:
      "Official coordinates will be loaded later.",
  },

  {
    id: "mission-3",
    provider: "CLPS DATA",
    name: "Mission Site Unavailable",
    status: "UNSOURCED",
    lat: null,
    lon: null,
    note:
      "Official coordinates will be loaded later.",
  },
];

/* ========================================
   MOON POSITION
======================================== */

function latLonToVec3(
  lat: number,
  lon: number,
  radius = 1
) {
  const phi =
    THREE.MathUtils.degToRad(
      90 - lat
    );

  const theta =
    THREE.MathUtils.degToRad(
      lon + 180
    );

  return new THREE.Vector3(
    -radius *
      Math.sin(phi) *
      Math.cos(theta),

    radius *
      Math.cos(phi),

    radius *
      Math.sin(phi) *
      Math.sin(theta)
  );
}

/* ========================================
   MOON MODEL
======================================== */

/* ========================================
   TARGET MARKER
======================================== */

function SiteMarker({
  lat,
  lon,
}: {
  lat: number;
  lon: number;
}) {
  const position =
    useMemo(
      () =>
        latLonToVec3(
          lat,
          lon,
          1.01
        ),
      [lat, lon]
    );

  const quaternion =
    useMemo(() => {
      return new THREE.Quaternion()
        .setFromUnitVectors(
          new THREE.Vector3(
            0,
            0,
            1
          ),
          position
            .clone()
            .normalize()
        );
    }, [position]);

  const ring =
    useRef<THREE.Mesh>(
      null
    );

  useFrame(
    ({ clock }) => {
      if (!ring.current) {
        return;
      }

      const p =
        (
          clock.elapsedTime *
          0.65
        ) % 1;

      ring.current.scale
        .setScalar(
          1 + p * 2
        );

      const material =
        ring.current
          .material as
          THREE.MeshBasicMaterial;

      material.opacity =
        0.7 *
        (1 - p);
    }
  );

  return (
    <group
      position={position}
      quaternion={
        quaternion
      }
    >
      <mesh>
        <sphereGeometry
          args={[
            0.012,
            18,
            18,
          ]}
        />

        <meshBasicMaterial
          color="#dffbff"
        />
      </mesh>

      <mesh ref={ring}>
        <ringGeometry
          args={[
            0.018,
            0.021,
            48,
          ]}
        />

        <meshBasicMaterial
          color="#5ce1ff"
          transparent
          opacity={0.7}
          depthWrite={
            false
          }
          side={
            THREE.DoubleSide
          }
        />
      </mesh>
    </group>
  );
}

/* ========================================
   CAMERA FLY TO
======================================== */

function CameraFlyTo({
  target,
}: {
  target:
    | THREE.Vector3
    | null;
}) {
  const camera =
    useThree(
      (state) =>
        state.camera
    );

  const goal =
    useRef<
      THREE.Vector3 | null
    >(null);

  useEffect(() => {
    goal.current =
      target
        ? target
            .clone()
            .normalize()
            .multiplyScalar(
              3.4
            )
        : null;
  }, [target]);

  useFrame(
    (_, delta) => {
      if (
        !goal.current
      ) {
        return;
      }

      camera.position.lerp(
        goal.current,
        1 -
          Math.pow(
            0.001,
            delta
          )
      );

      camera.lookAt(
        0,
        0,
        0
      );

      if (
        camera.position
          .distanceTo(
            goal.current
          ) < 0.01
      ) {
        goal.current =
          null;
      }
    }
  );

  return null;
}

/* ========================================
   MOON SCENE
======================================== */

function MoonScene({
  site,
  quality,
  onInteract,
  onTextureStatus,
}: {
  site: MissionSite;
  quality: Quality;
  onInteract: () => void;
  onTextureStatus: (status: TextureStatus) => void;
}) {
  const target =
    site.lat !== null &&
    site.lon !== null
      ? latLonToVec3(
          site.lat,
          site.lon
        )
      : null;

  const isPolar =
    site.lat !== null &&
    Math.abs(
      site.lat
    ) >= 80;

  const sunPosition:
    [
      number,
      number,
      number
    ] =
    isPolar
      ? [
          4,
          -0.6,
          2.5,
        ]
      : [
          5,
          1.5,
          3,
        ];

  const ambientIntensity =
    isPolar
      ? 0.06
      : 0.025;

  const starCount =
    quality === "high"
      ? 4200
      : quality ===
        "medium"
      ? 2200
      : 700;

  const maxDpr =
    quality === "high"
      ? 1.7
      : quality ===
        "medium"
      ? 1.3
      : 1;

  return (
    <Canvas
      dpr={[
        1,
        maxDpr,
      ]}
      camera={{
        position: [
          0,
          0,
          3.4,
        ],
        fov: 34,
      }}
      gl={{
        antialias:
          quality !==
          "low",

        powerPreference:
          "high-performance",
      }}
    >
      <color
        attach="background"
        args={[
          "#020408",
        ]}
      />

      <ambientLight
        intensity={
          ambientIntensity
        }
        color="#9db4ff"
      />

      <directionalLight
        position={
          sunPosition
        }
        intensity={2.8}
        color="#fff6e8"
      />

      <Stars
        radius={60}
        depth={40}
        count={starCount}
        factor={2.4}
        fade
        speed={0.1}
      />

      <MoonModel onStatus={onTextureStatus} />

      {site.lat !== null &&
        site.lon !== null && (
          <SiteMarker
            lat={site.lat}
            lon={site.lon}
          />
        )}

      <CameraFlyTo
        target={target}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={
          0.08
        }
        enablePan={
          false
        }
        minDistance={
          2.2
        }
        maxDistance={
          5
        }
        rotateSpeed={
          0.55
        }
        onStart={
          onInteract
        }
      />
    </Canvas>
  );
}

/* ========================================
   GAUGE
======================================== */

function ArcGauge({
  label,
  value,
  sun = false,
  badgeLabel,
  badgeTone = "cached",
  detail,
  note,
}: {
  label: string;
  value: number | null;
  sun?: boolean;
  badgeLabel: string;
  badgeTone?: "cached" | "demo";
  detail: string;
  note: string;
}) {
  const min = -90;
  const max = 90;

  const circumference =
    Math.PI * 54;

  const progress =
    value === null
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            (value -
              min) /
              (max -
                min)
          )
        );

  return (
    <section
      className={`panel gauge-card ${
        sun
          ? "sun-gauge"
          : ""
      }`}
    >
      <header>
        <span className="panel-label">
          {label}
        </span>

        <span
          className={`badge ${badgeTone}`}
        >
          {badgeLabel}
        </span>
      </header>

      <svg
        viewBox="0 0 140 82"
        className="arc"
      >
        <path
          d="M16 70 A54 54 0 0 1 124 70"
          className="arc-track"
        />

        <path
          d="M16 70 A54 54 0 0 1 124 70"
          className="arc-fill"
          style={{
            strokeDasharray:
              circumference,

            strokeDashoffset:
              circumference *
              (1 -
                progress),
          }}
        />

        <line
          x1="70"
          y1="16"
          x2="70"
          y2="24"
          className="zero-tick"
        />

        <text
          x="70"
          y="13"
          textAnchor="middle"
          className="zero-label"
        >
          0°
        </text>
      </svg>

      <div className="gauge-number num">
        {value === null
          ? "N/A"
          : formatAngle(value, true)}

      </div>

      <p>
        {detail}
      </p>

      <small>
        {note}
      </small>
    </section>
  );
}

/* ========================================
   CLOCK
======================================== */

function UtcClock() {
  const [
    time,
    setTime,
  ] =
    useState(
      new Date()
    );

  useEffect(() => {
    const id =
      window.setInterval(
        () =>
          setTime(
            new Date()
          ),
        1000
      );

    return () =>
      window.clearInterval(
        id
      );
  }, []);

  return (
    <span className="utc num">
      {time
        .toISOString()
        .slice(
          0,
          19
        )
        .replace(
          "T",
          " "
        )}{" "}
      UTC
    </span>
  );
}

/* ========================================
   COPILOT
======================================== */

function CopilotDock() {
  const [
    collapsed,
    setCollapsed,
  ] =
    useState(false);

  const [
    input,
    setInput,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState(
      "Mission Copilot is in UI-only standby. AI providers are not enabled in this phase."
    );

  function sendToCopilot(
    prompt: string
  ) {
    setMessage(
      `STANDBY — "${prompt}" was not sent. /api/copilot is not connected yet.`
    );
  }

  const suggestions = [
    "Explain this site",
    "Show next sunset",
    "Why can Earth LOS change?",
  ];

  if (collapsed) {
    return (
      <button
        className="copilot-orb"
        onClick={() =>
          setCollapsed(
            false
          )
        }
      >
        <Bot
          size={20}
        />

        <span />
      </button>
    );
  }

  return (
    <section className="copilot panel">

      <header>
        <div className="copilot-brand">
          <div className="ai-icon">
            <Sparkles
              size={15}
            />
          </div>

          <div>
            <span className="panel-label">
              Mission Copilot
            </span>

            <strong>
              STANDBY
            </strong>
          </div>
        </div>

        <button
          className="icon-btn"
          onClick={() =>
            setCollapsed(
              true
            )
          }
        >
          <ChevronDown
            size={16}
          />
        </button>
      </header>

      <div className="ai-message">
        <div className="avatar">
          H89
        </div>

        <div className="bubble">
          <p>
            {message}
          </p>

          <button
            className="copy-btn"
            onClick={() =>
              navigator
                .clipboard
                ?.writeText(
                  message
                )
            }
          >
            <Copy
              size={12}
            />
          </button>
        </div>
      </div>

      <div className="chips">
        {suggestions.map(
          (suggestion) => (
            <button
              key={
                suggestion
              }
              onClick={() =>
                sendToCopilot(
                  suggestion
                )
              }
            >
              {suggestion}
            </button>
          )
        )}
      </div>

      <div className="ai-input">
        <input
          value={input}
          placeholder="Ask about this mission..."
          onChange={(e) =>
            setInput(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key ===
              "Enter"
            ) {
              const value =
                input.trim();

              if (value) {
                sendToCopilot(
                  value
                );

                setInput("");
              }
            }
          }}
        />

        <button
          onClick={() => {
            const value =
              input.trim();

            if (!value) {
              return;
            }

            sendToCopilot(
              value
            );

            setInput("");
          }}
        >
          <Send
            size={15}
          />
        </button>
      </div>
    </section>
  );
}

/* ========================================
   APP
======================================== */

export default function App() {
  const [manualAlt, setManualAlt] = useState("0");
  const [textureStatus, setTextureStatus] = useState<TextureStatus>("LOADING");
  const [
    sites,
    setSites,
  ] =
    useState(
      initialSites
    );

  const [
    activeId,
    setActiveId,
  ] =
    useState(
      "manual"
    );

  const [
    quality,
    setQuality,
  ] =
    useState<Quality>(
      "medium"
    );

  const [
    commandOpen,
    setCommandOpen,
  ] =
    useState(false);

  const [
    booting,
    setBooting,
  ] =
    useState(true);

  const [
    moonUsed,
    setMoonUsed,
  ] =
    useState(false);

  const [
    manualLat,
    setManualLat,
  ] =
    useState("-89");

  const [
    manualLon,
    setManualLon,
  ] =
    useState("0");

  const [
    timeline,
    setTimeline,
  ] =
    useState(360);

  const [
    playing,
    setPlaying,
  ] =
    useState(false);

  const [
    speed,
    setSpeed,
  ] =
    useState(1);

  const [
    geometry,
    setGeometry,
  ] =
    useState<HorizonsGeometryResponse | null>(
      null
    );

  const [
    geometryLoading,
    setGeometryLoading,
  ] =
    useState(false);

  const [
    geometryError,
    setGeometryError,
  ] =
    useState<string | null>(
      null
    );

  const activeSite =
    sites.find(
      (site) =>
        site.id ===
        activeId
    ) ??
    sites[0];

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "h89-quality"
      );

    if (
      saved === "low" ||
      saved === "medium" ||
      saved === "high"
    ) {
      setQuality(
        saved
      );
    }
  }, []);

  useEffect(() => {
    document
      .documentElement
      .setAttribute(
        "data-quality",
        quality
      );

    localStorage.setItem(
      "h89-quality",
      quality
    );
  }, [quality]);

  useEffect(() => {
    const id =
      window.setTimeout(
        () =>
          setBooting(
            false
          ),
        2200
      );

    return () =>
      window.clearTimeout(
        id
      );
  }, []);

  useEffect(() => {
    function keydown(
      e: KeyboardEvent
    ) {
      if (
        (e.ctrlKey ||
          e.metaKey) &&
        e.key.toLowerCase() ===
          "k"
      ) {
        e.preventDefault();

        setCommandOpen(
          true
        );
      }

      if (
        e.key ===
        "Escape"
      ) {
        setCommandOpen(
          false
        );
      }
    }

    window.addEventListener(
      "keydown",
      keydown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        keydown
      );
  }, []);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const id =
      window.setInterval(
        () => {
          setTimeline(
            (current) =>
              (
                current +
                speed
              ) % 1440
          );
        },
        700
      );

    return () =>
      window.clearInterval(
        id
      );
  }, [
    playing,
    speed,
  ]);

  const missionTime =
    useMemo(() => {
      const base =
        new Date(
          "2026-10-10T00:00:00Z"
        );

      return new Date(
        base.getTime() +
          timeline *
            60_000
      );
    }, [timeline]);

  function applyManualSite() {
    const lat =
      Number(
        manualLat
      );

    const lon =
      Number(
        manualLon
      );

    const altitudeKm = Number(manualAlt);
    try {
      if (![manualLat, manualLon, manualAlt].every(value => value.trim())) throw new Error("Site inputs must not be empty.");
      validateSiteTime(lat, lon, missionTime.toISOString());
      validateAltitude(altitudeKm);
    } catch (error) {
      setGeometryError(error instanceof Error ? error.message : "Invalid site.");
      return;
    }
    setGeometryError(null);

    setSites(
      (current) =>
        current.map(
          (site) =>
            site.id ===
            "manual"
              ? {
                  ...site,
                  lat,
                  lon,
                  altitudeKm,
                }
              : site
        )
    );

    setActiveId(
      "manual"
    );
  }

  useEffect(() => {
    if (
      activeSite.lat === null ||
      activeSite.lon === null
    ) {
      setGeometryError(
        "Selected site has no verified coordinates."
      );
      setGeometryLoading(false);
      return;
    }

    if (playing) {
      setGeometryError(null);
      setGeometryLoading(false);
      return;
    }

    let cancelled = false;

    setGeometryLoading(true);
    setGeometryError(null);

    const timer =
      window.setTimeout(() => {
        getLunarGeometry(
          activeSite.lat as number,
          activeSite.lon as number,
          missionTime.toISOString(),
          activeSite.altitudeKm ?? 0
        )
          .then((data) => {
            if (cancelled) {
              return;
            }

            setGeometry(data);
          })
          .catch((error) => {
            if (cancelled) {
              return;
            }


            setGeometryError(
              error instanceof Error
                ? error.message
                : "NASA/JPL Horizons data is unavailable."
            );
          })
          .finally(() => {
            if (!cancelled) {
              setGeometryLoading(false);
            }
          });
      }, 500);

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    activeSite.lat,
    activeSite.lon,
    activeSite.altitudeKm,
    missionTime,
    playing,
  ]);

  // Retain the last successful snapshot, but never label stale values as the requested analysis.
  const displayGeometry = !geometryLoading && !geometryError && !playing &&
    geometry?.lunarSite.latitude === activeSite.lat && geometry?.lunarSite.longitude === activeSite.lon &&
    (geometry?.lunarSite.altitudeKm ?? 0) === (activeSite.altitudeKm ?? 0) &&
    geometry?.timeUTC === missionTime.toISOString() ? geometry : null;

  const geometryBadgeLabel =
    playing
      ? "PAUSE TO QUERY"
      : geometryLoading
      ? "REQUESTING"
      : displayGeometry
      ? adaptLegacyHorizons(displayGeometry).status
      : geometryError
      ? "UNAVAILABLE"
      : "WAITING";

  const geometryBadgeTone:
    "cached" | "demo" =
    displayGeometry && !geometryLoading
      ? "cached"
      : "demo";

  const sunElevation =
    displayGeometry?.sun.elevationDegrees ??
    null;

  const earthElevation =
    displayGeometry?.earth.elevationDegrees ??
    null;

  const sunAzimuth =
    displayGeometry?.sun.azimuthDegrees ??
    null;

  const earthAzimuth =
    displayGeometry?.earth.azimuthDegrees ??
    null;

  const geometryDetail =
    playing
      ? "Pause timeline to request JPL geometry"
      : geometryLoading
      ? "Requesting NASA/JPL Horizons"
      : displayGeometry
      ? `Calculated for ${displayGeometry.timeUTC.replace("T", " ")} UTC${displayGeometry.provenance?.producedAtUTC ? ` · Retrieved ${displayGeometry.provenance.producedAtUTC}` : ""}`
      : geometryError
      ? "No fallback or demo geometry is being shown"
      : "Waiting for a valid lunar site and time";

  if (booting) {
    return (
      <div className="boot">
        <div className="boot-logo">
          H89
        </div>

        <h1>
          HORIZON 89
        </h1>

        <p>
          INITIALIZING LUNAR MODEL...
        </p>

        <p>
          CHECKING LROC IMAGERY...
        </p>

        <button
          onClick={() =>
            setBooting(
              false
            )
          }
        >
          SKIP
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="app">

        {/* TOP BAR */}

        <header className="topbar panel">

          <div className="brand-lockup">

            <div className="brand-mark">
              <LocateFixed
                size={18}
              />
            </div>

            <div>
              <strong>
                HORIZON 89
              </strong>

              <span>
                CLPS LUNAR MISSION BROWSER
              </span>
            </div>

          </div>

          <div className="top-actions">

            <div className="utc-block">
              <span className="panel-label">
                UTC
              </span>

              <UtcClock />
            </div>

            <div className="system-pill">
              <span className="status-dot" />

              {geometryLoading
                ? "JPL QUERYING"
                : geometry
                ? "JPL LINKED"
                : geometryError
                ? "JPL UNAVAILABLE"
                : "SYSTEM NOMINAL"}
            </div>

            <div className="quality">

              {(
                [
                  "low",
                  "medium",
                  "high",
                ] as Quality[]
              ).map(
                (item) => (
                  <button
                    key={
                      item
                    }
                    className={
                      quality ===
                      item
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setQuality(
                        item
                      )
                    }
                  >
                    {item.toUpperCase()}
                  </button>
                )
              )}

            </div>

            <button
              className="command-btn"
              onClick={() =>
                setCommandOpen(
                  true
                )
              }
            >
              <Search
                size={14}
              />

              <span>
                COMMAND
              </span>

              <kbd>
                Ctrl K
              </kbd>
            </button>

          </div>

        </header>

        {/* LEFT RAIL */}

        <aside className="left-rail">

          <header className="rail-header">

            <div>
              <span className="panel-label">
                Mission targets
              </span>

              <h2>
                CLPS SITES
              </h2>
            </div>

            <Crosshair
              size={16}
            />

          </header>

          <div className="mission-list">

            {sites.map(
              (site) => (
                <button
                  key={
                    site.id
                  }
                  className={`mission-card ${
                    site.id ===
                    activeId
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveId(
                      site.id
                    )
                  }
                >
                  <div className="mission-card-top">

                    <span>
                      {site.provider}
                    </span>

                    <b>
                      {site.status}
                    </b>

                  </div>

                  <strong>
                    {site.name}
                  </strong>

                  <div className="coords">

                    <MapPin
                      size={12}
                    />

                    {site.lat ===
                      null ||
                    site.lon ===
                      null
                      ? "Coordinates unavailable"
                      : `${Math.abs(
                          site.lat
                        ).toFixed(
                          3
                        )}°${
                          site.lat <
                          0
                            ? "S"
                            : "N"
                        }  ${Math.abs(
                          site.lon
                        ).toFixed(
                          3
                        )}°${
                          site.lon <
                          0
                            ? "W"
                            : "E"
                        }`}

                  </div>

                  <small>
                    {site.note}
                  </small>

                </button>
              )
            )}

          </div>

          {/* THIS ALWAYS STAYS BELOW THE SCROLLING LIST */}

          <section className="manual-site panel">

            <span className="panel-label">
              Manual target
            </span>

            <div className="manual-grid">

              <label>
                LAT

                <input
                  value={
                    manualLat
                  }
                  onChange={(e) =>
                    setManualLat(
                      e.target
                        .value
                    )
                  }
                />
              </label>

              <label>
                LON

                <input
                  value={
                    manualLon
                  }
                  onChange={(e) =>
                    setManualLon(
                      e.target
                        .value
                    )
                  }
                />
              </label>

              <label>
                ALT (km)
                <input value={manualAlt} onChange={e => setManualAlt(e.target.value)} aria-label="Altitude above reference ellipsoid (km)" />
              </label>
            </div>
            {geometryError && <p role="alert">{geometryError}</p>}

            <button
              className="apply-btn"
              onClick={
                applyManualSite
              }
            >
              APPLY TARGET
            </button>

          </section>

        </aside>

        {/* MOON */}

        <main className="stage panel bracket">

          <MoonScene
            site={
              activeSite
            }
            quality={
              quality
            }
            onTextureStatus={setTextureStatus}
            onInteract={() =>
              setMoonUsed(
                true
              )
            }
          />

          <div className="stage-header">

            <div>
              <span className="panel-label">
                Illustrative lighting · not a science-derived terminator
              </span>

              <strong>
                {textureStatus === "AVAILABLE" ? "LROC MORPHOLOGY IMAGERY" : "REFERENCE SPHERE · IMAGERY UNAVAILABLE"}
              </strong>
            </div>

            <span className="badge demo">
              {textureStatus}
            </span>

          </div>

          <div className="hud-corners">
            <i />
            <i />
            <i />
            <i />
          </div>

          <div className="target-reticle">
            <span />
            <i />
          </div>

          <div className="selected-target">

            <span className="panel-label">
              Selected target
            </span>

            {activeSite.lat ===
              null ||
            activeSite.lon ===
              null ? (
              <strong className="num">
                Coordinates unavailable
              </strong>
            ) : (
              <strong className="num">
                {activeSite.lat.toFixed(
                  3
                )}
                ° /{" "}
                {activeSite.lon.toFixed(
                  3
                )}
                °
              </strong>
            )}

            <small>
              {activeSite.name}
            </small>

          </div>

          {!moonUsed && (
            <div className="drag-hint">
              DRAG TO ROTATE · SCROLL TO ZOOM
            </div>
          )}

          <CopilotDock />

        </main>

        {/* RIGHT PANEL */}

        <aside className="right-panel">

          <header className="right-header">

            <div>
              <span className="panel-label">
                Environment
              </span>

              <h2>
                LOCAL HORIZON
              </h2>
            </div>

            <Activity
              size={16}
            />

          </header>

          <ArcGauge
            label="Sun elevation"
            value={
              sunElevation
            }
            sun
            badgeLabel={
              geometryBadgeLabel
            }
            badgeTone={
              geometryBadgeTone
            }
            detail={
              geometryDetail
            }
            note="Airless apparent direction · reference horizon · terrain not evaluated"
          />

          <ArcGauge
            label="Earth elevation"
            value={
              earthElevation
            }
            badgeLabel={
              geometryBadgeLabel
            }
            badgeTone={
              geometryBadgeTone
            }
            detail={
              geometryDetail
            }
            note="Airless apparent direction · reference horizon · no link budget"
          />

          {geometry && !displayGeometry && <p className="panel-label" role="status">
            Last successful analysis retained: {geometry.lunarSite.latitude}° / {geometry.lunarSite.longitude}° · {geometry.timeUTC}. Current request unavailable or pending.
          </p>}

          <section className="panel azimuths">

            <div>
              <span className="panel-label">
                Sun azimuth
              </span>

              <strong className="num">
                {sunAzimuth === null
                  ? "N/A"
                  : formatAngle(sunAzimuth)}
              </strong>
            </div>

            <div>
              <span className="panel-label">
                Earth azimuth
              </span>

              <strong className="num">
                {earthAzimuth === null
                  ? "N/A"
                  : formatAngle(earthAzimuth)}
              </strong>
            </div>

            <span
              className={`badge ${geometryBadgeTone}`}
            >
              {geometryBadgeLabel}
            </span>

          </section>

          <div className="status-grid">

            <section
              className={`panel status-card ${
                displayGeometry?.sun
                  .geometricallyAboveHorizon
                  ? "on"
                  : ""
              }`}
            >

              <span className="panel-label">
                Sun horizon
              </span>

              <strong>
                {displayGeometry
                  ? displayGeometry.sun
                      .geometricallyAboveHorizon
                    ? "ABOVE"
                    : "BELOW"
                  : "N/A"}
              </strong>

              <span
                className={`badge ${geometryBadgeTone}`}
              >
                {geometryBadgeLabel}
              </span>

              <small>
                Reference horizon only · terrain not evaluated
              </small>

            </section>

            <section
              className={`panel status-card ${
                displayGeometry?.earth
                  .geometricallyAboveHorizon
                  ? "on"
                  : ""
              }`}
            >

              <span className="panel-label">
                Earth horizon
              </span>

              <strong>
                {displayGeometry
                  ? displayGeometry.earth
                      .geometricallyAboveHorizon
                    ? "ABOVE"
                    : "BELOW"
                  : "N/A"}
              </strong>

              <span
                className={`badge ${geometryBadgeTone}`}
              >
                {geometryBadgeLabel}
              </span>

              <small>
                Reference horizon only · communications not confirmed
              </small>

            </section>

          </div>

          <section className="panel trend">

            <header>
              <div>
                <span className="panel-label">
                  30-day preview
                </span>

                <strong>
                  VISIBILITY TREND
                </strong>
              </div>

              <span className="badge demo">
                DEMO
              </span>
            </header>

            <svg
              viewBox="0 0 280 80"
            >

              <line
                x1="0"
                y1="70"
                x2="280"
                y2="70"
              />

              <polyline
                points="
                0,60
                20,53
                40,42
                60,31
                80,25
                100,28
                120,38
                140,48
                160,51
                180,43
                200,32
                220,24
                240,20
                260,26
                280,36
                "
                className="solar-line"
              />

              <polyline
                points="
                0,33
                20,29
                40,27
                60,31
                80,40
                100,47
                120,49
                140,44
                160,35
                180,27
                200,24
                220,27
                240,35
                260,42
                280,45
                "
                className="earth-line"
              />

            </svg>

            <div className="legend">

              <span>
                <i className="sun-key" />
                Solar
              </span>

              <span>
                <i className="earth-key" />
                Earth LOS
              </span>

            </div>

            <small>
              Illustrative UI series · not mission data
            </small>

          </section>

        </aside>

        {/* BOTTOM */}

        <footer className="timebar panel">

          <div className="play-area">

            <button
              className="play-btn"
              onClick={() =>
                setPlaying(
                  (value) =>
                    !value
                )
              }
            >
              {playing ? (
                <Pause
                  size={16}
                />
              ) : (
                <Play
                  size={16}
                />
              )}
            </button>

            <div className="speed">

              {[1, 10, 100].map(
                (item) => (
                  <button
                    key={
                      item
                    }
                    className={
                      speed ===
                      item
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSpeed(
                        item
                      )
                    }
                  >
                    {item}×
                  </button>
                )
              )}

            </div>

          </div>

          <div className="scrubber">

            <div>
              <span className="panel-label">
                Mission timeline
              </span>

              <span className="num">
                {timeline} MIN
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1439"
              value={
                timeline
              }
              onChange={(e) =>
                setTimeline(
                  Number(
                    e.target
                      .value
                  )
                )
              }
            />

          </div>

          <div className="mission-time">

            <span className="panel-label">
              Mission UTC
            </span>

            <strong className="num">
              {missionTime
                .toISOString()
                .slice(
                  0,
                  16
                )
                .replace(
                  "T",
                  " "
                )}
            </strong>

          </div>

          <div className="mode">

            <Cpu
              size={14}
            />

            <div>
              <span className="panel-label">
                Mode
              </span>

              <strong>
                UI DEMO
              </strong>
            </div>

          </div>

        </footer>

      </div>

      {/* COMMAND */}

      {commandOpen && (
        <div
          className="command-overlay"
          onMouseDown={() =>
            setCommandOpen(
              false
            )
          }
        >
          <div
            className="command-panel panel"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <header>

              <Search
                size={17}
              />

              <input
                autoFocus
                placeholder="Search Horizon 89 commands..."
              />

              <button
                onClick={() =>
                  setCommandOpen(
                    false
                  )
                }
              >
                <X
                  size={17}
                />
              </button>

            </header>

            <button
              onClick={() => {
                setQuality(
                  "low"
                );

                setCommandOpen(
                  false
                );
              }}
            >
              Graphics quality: Low
            </button>

            <button
              onClick={() => {
                setQuality(
                  "medium"
                );

                setCommandOpen(
                  false
                );
              }}
            >
              Graphics quality: Medium
            </button>

            <button
              onClick={() => {
                setQuality(
                  "high"
                );

                setCommandOpen(
                  false
                );
              }}
            >
              Graphics quality: High
            </button>

          </div>
        </div>
      )}

    </>
  );
}