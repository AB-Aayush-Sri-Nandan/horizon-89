import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as Controls } from "three-stdlib";
import * as THREE from "three";
import { solarBodies } from "../data/catalog";
import { planetTexturePaths, imageryNotes } from "../data/planetImagery";
import { solarPosition, smoothFlight, type SolarSession } from "../lib/solar";
import MercuryModel from "./MercuryModel";
import { useScenePreferences } from "../lib/useScenePreferences";
import SceneBoundary from "./SceneBoundary";
import type { LunarImage } from "./LunarImagery";
type Quality = "low" | "medium" | "high";
function SolarFallback({
  onEnterMoon,
  onRetry,
}: {
  onEnterMoon: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="scene-fallback">
      <h2>3D rendering unavailable</h2>
      <p>
        The object directory, source notes and lunar workspace remain available.
      </p>
      <button onClick={onRetry}>Reload Solar viewer</button>
      <button onClick={onEnterMoon}>Open lunar Mission Control</button>
    </div>
  );
}
function Orbit({ radius }: { radius: number }) {
  const geometry = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints(
        Array.from(
          { length: 128 },
          (_, i) =>
            new THREE.Vector3(
              Math.cos((i / 128) * Math.PI * 2) * radius,
              0,
              Math.sin((i / 128) * Math.PI * 2) * radius,
            ),
        ),
      ),
    [radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="#4b626f" transparent opacity={0.22} />
    </lineLoop>
  );
}
function Planet({
  body,
  selected,
  clock,
  moving,
  onSelect,
  quality,
  falseColor,
  onStatus,
  moonImage,
}: {
  body: (typeof solarBodies)[number];
  moonImage: LunarImage;
  selected: string;
  clock: MutableRefObject<number>;
  moving: boolean;
  onSelect: (name: string) => void;
  quality: Quality;
  falseColor: boolean;
  onStatus: (name: string, status: string) => void;
}) {
  const group = useRef<THREE.Group>(null),
    surface = useRef<THREE.Group>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const modelStatus = useCallback(
    (loaded: boolean, status: string) => {
      setModelLoaded(loaded);
      onStatus("Mercury", status);
    },
    [onStatus],
  );
  useFrame((_, delta) => {
    group.current?.position.set(...solarPosition(body.name, clock.current));
    if (moving && surface.current)
      surface.current.rotation.y +=
        Math.min(delta, 0.1) *
        (body.name === "Venus" || body.name === "Uranus" ? -0.08 : 0.14);
  }, -1);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const url =
    body.name === "Moon"
      ? moonImage.url
      : body.name === "Venus" && !falseColor
        ? null
        : planetTexturePaths[body.name];
  const { invalidate } = useThree();
  useEffect(() => {
    let active = true;
    let resource: THREE.Texture | undefined;
    if (!url) {
      if (body.name !== "Mercury")
        onStatus(body.name, "Untextured · see provenance");
      return;
    }
    onStatus(body.name, "Loading source map…");
    new THREE.TextureLoader().load(
      url,
      (map) => {
        resource = map;
        if (!active) {
          map.dispose();
          return;
        }
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 2;
        setTexture(map);
        onStatus(
          body.name,
          body.name === "Moon"
            ? moonImage.state === "available"
              ? "LROC WAC map loaded"
              : "Legacy qualitative map"
            : "NASA map loaded",
        );
        invalidate();
      },
      undefined,
      () => {
        if (active)
          onStatus(body.name, "Image unavailable · untextured fallback");
      },
    );
    return () => {
      active = false;
      resource?.dispose();
    };
  }, [url, body.name, onStatus, invalidate, moonImage.state]);
  const map = url ? texture : null;
  return (
    <group
      ref={group}
      position={solarPosition(body.name, clock.current)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(body.name);
      }}
    >
      <group ref={surface}>
        {body.name === "Mercury" && (
          <MercuryModel radius={body.radius} onStatus={modelStatus} />
        )}
        <mesh
          visible={!modelLoaded}
          castShadow={quality === "high" && body.name !== "Sun"}
          receiveShadow={quality === "high"}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(body.name);
          }}
        >
          <sphereGeometry
            args={[
              body.radius,
              quality === "low" ? 24 : 48,
              quality === "low" ? 16 : 32,
            ]}
          />
          <meshStandardMaterial
            key={map?.uuid ?? "plain"}
            map={map}
            color={
              map ? "#ffffff" : body.name === "Venus" ? "#d8ccaa" : body.color
            }
            emissive={body.name === "Sun" ? "#ffbd50" : "#000000"}
            emissiveIntensity={body.name === "Sun" ? 2 : 0}
            roughness={1}
          />
        </mesh>
      </group>
      {body.name === "Saturn" && (
        <mesh rotation={[-Math.PI / 2, 0.15, 0]}>
          <ringGeometry args={[0.8, 1.2, 96]} />
          <meshStandardMaterial
            color="#d0bc91"
            side={THREE.DoubleSide}
            transparent
            opacity={0.68}
          />
        </mesh>
      )}
      {["Earth", "Venus", "Neptune", "Uranus"].includes(body.name) &&
        quality !== "low" && (
          <mesh>
            <sphereGeometry args={[body.radius * 1.035, 32, 24]} />
            <meshBasicMaterial
              color={body.name === "Earth" ? "#70baff" : "#c9d7ed"}
              side={THREE.BackSide}
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
        )}
      {body.name === selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.radius * 1.2, body.radius * 1.24, 64]} />
          <meshBasicMaterial color="#6de1ef" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
interface Flight {
  elapsed: number;
  duration: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
  landing: boolean;
  reported: number;
}
function Scene({
  selected,
  day,
  onSelect,
  tracking,
  flying,
  onArrive,
  onProgress,
  quality,
  falseColor,
  onStatus,
  reduced,
  moonImage,
  focusVersion,
  playing,
  visible,
  onDay,
  initialSession,
  onCamera,
  onContextLost,
}: {
  onContextLost: () => void;
  playing: boolean;
  visible: boolean;
  onDay: (day: number) => void;
  initialSession: SolarSession;
  onCamera: (
    camera: [number, number, number],
    target: [number, number, number],
  ) => void;
  selected: string;
  focusVersion: number;
  day: number;
  onSelect: (name: string) => void;
  tracking: boolean;
  flying: boolean;
  onArrive: () => void;
  onProgress: (progress: number) => void;
  quality: Quality;
  falseColor: boolean;
  onStatus: (name: string, status: string) => void;
  reduced: boolean;
  moonImage: LunarImage;
}) {
  const { camera, invalidate, gl } = useThree(),
    controls = useRef<Controls>(null),
    flight = useRef<Flight | null>(null),
    lastFocus = useRef("");
  const clock = useRef(day),
    report = useRef(0),
    previousTarget = useRef(new THREE.Vector3(...solarPosition(selected, day)));
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  const firstFocus = useRef(true);
  useEffect(() => {
    if (day === 0) clock.current = 0;
    invalidate();
  }, [day, focusVersion, invalidate]);
  useFrame((_, delta) => {
    if (!visible || document.hidden) return;
    const dt = Math.min(delta, 0.1);
    if (controls.current)
      controls.current.dampingFactor = 1 - Math.exp(-5 * dt);
    if (playing && !flying && !reduced) clock.current += dt * 10;
    report.current += dt;
    if (report.current >= 0.25) {
      report.current = 0;
      if (playing && !reduced) onDay(clock.current);
      if (controls.current)
        onCamera(camera.position.toArray(), controls.current.target.toArray());
    }
  }, -2);
  useEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      if (
        focusVersion === 0 &&
        !flying &&
        initialSession.camera &&
        initialSession.target
      ) {
        camera.position.fromArray(initialSession.camera);
        controls.current?.target.fromArray(initialSession.target);
        controls.current?.update();
        lastFocus.current = selected;
        return;
      }
    }
    if (!tracking && !flying && lastFocus.current === selected) return;
    lastFocus.current = selected;
    const p = new THREE.Vector3(...solarPosition(selected, clock.current));
    const body = solarBodies.find((item) => item.name === selected)!;
    const distance = flying
      ? 0.25
      : selected === "Sun"
        ? 23
        : Math.max(1.1, body.radius * 5.5);
    const to = p
      .clone()
      .add(new THREE.Vector3(distance, distance * 0.6, distance));
    flight.current = {
      elapsed: 0,
      duration: reduced ? 1 : flying ? 1800 : 850,
      from: camera.position.clone(),
      to,
      targetFrom: controls.current?.target.clone() ?? new THREE.Vector3(),
      targetTo: p,
      landing: flying,
      reported: -1,
    };
    invalidate();
  }, [
    selected,
    tracking,
    flying,
    camera,
    invalidate,
    reduced,
    focusVersion,
    initialSession.camera,
    initialSession.target,
  ]);
  useFrame((_, delta) => {
    if (!visible || document.hidden) return;
    const dt = Math.min(delta, 0.1);
    const current = flight.current;
    const target = new THREE.Vector3(...solarPosition(selected, clock.current));
    if (current) {
      current.elapsed += dt * 1000;
      const t = Math.min(1, current.elapsed / current.duration),
        ease = smoothFlight(t);
      camera.position.lerpVectors(current.from, current.to, ease);
      controls.current?.target.lerpVectors(
        current.targetFrom,
        current.targetTo,
        ease,
      );
      controls.current?.update();
      camera.lookAt(controls.current?.target ?? current.targetTo);
      if (current.landing && Math.floor(t * 10) > current.reported) {
        current.reported = Math.floor(t * 10);
        onProgress(t);
      }
      if (t >= 1) {
        flight.current = null;
        if (current.landing) onArrive();
      }
    } else if (tracking && controls.current && playing && !reduced) {
      // Follow orbital displacement without restarting the selection flight.
      const shift = target.clone().sub(previousTarget.current);
      camera.position.add(shift);
      controls.current.target.add(shift);
    }
    previousTarget.current.copy(target);
  });
  useEffect(() => {
    if (!visible) return;
    // Demand mode when idle; cap low-power motion at 30 requested frames/sec.
    const id = window.setInterval(
      () => {
        if (!document.hidden && ((playing && !reduced) || flight.current)) invalidate();
        else clearInterval(id);
      },
      quality === "low" ? 33 : 16,
    );
    return () => clearInterval(id);
  }, [
    visible,
    playing,
    reduced,
    quality,
    invalidate,
    selected,
    focusVersion,
    flying,
    tracking,
  ]);
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight
        position={[0, 0, 0]}
        intensity={180}
        decay={1}
        castShadow={quality === "high"}
        shadow-mapSize={[512, 512]}
      />
      <Stars
        radius={70}
        depth={35}
        count={quality === "low" ? 550 : quality === "high" ? 2200 : 1200}
        factor={2}
        fade
        speed={0}
      />
      {solarBodies
        .filter((b) => b.orbit && b.name !== "Moon")
        .map((body) => (
          <Orbit key={body.name} radius={body.orbit} />
        ))}
      {solarBodies.map((body) => (
        <Planet
          key={
            body.name +
            (body.name === "Venus"
              ? String(falseColor)
              : body.name === "Moon"
                ? moonImage.url
                : "")
          }
          body={body}
          moonImage={moonImage}
          selected={selected}
          clock={clock}
          moving={playing && !flying && !reduced && visible}
          onSelect={onSelect}
          quality={quality}
          falseColor={falseColor}
          onStatus={onStatus}
        />
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={!reduced}
        dampingFactor={0.08}
        enabled={!flying}
        minDistance={0.12}
        maxDistance={55}
        onEnd={() => {
          if (controls.current)
            onCamera(
              camera.position.toArray(),
              controls.current.target.toArray(),
            );
        }}
        onStart={() => {
          flight.current = null;
        }}
      />
    </>
  );
}
export default function SolarExplorer({
  onSelectBody,
  onEnterMoon,
  initialSession,
  onSessionChange,
  quality,
  onQualityChange,
  moonImage,
}: {
  onSelectBody: (name: string) => void;
  onEnterMoon: () => void;
  initialSession: SolarSession;
  onSessionChange: (session: SolarSession) => void;
  quality: Quality;
  onQualityChange: (quality: Quality) => void;
  moonImage: LunarImage;
}) {
  const [selected, setSelected] = useState(initialSession.selected),
    [day, setDay] = useState(initialSession.day),
    [tracking, setTracking] = useState(initialSession.tracking),
    [playing, setPlaying] = useState(false),
    [flying, setFlying] = useState(false),
    [progress, setProgress] = useState(0),
    [focusVersion, setFocusVersion] = useState(0),
    [falseColor, setFalseColor] = useState(initialSession.falseColor ?? false),
    [statuses, setStatuses] = useState<Record<string, string>>({}),
    [unavailable, setUnavailable] = useState(false),
    [attempt, setAttempt] = useState(0);
  const { visible, reduced } = useScenePreferences();
  const markUnavailable = useCallback(() => {
    setUnavailable(true);
    setFlying(false);
    setPlaying(false);
  }, []);
  const retry = useCallback(() => {
    setUnavailable(false);
    setAttempt((v) => v + 1);
  }, []);
  const [cameraState, setCameraState] = useState({
    camera: initialSession.camera,
    target: initialSession.target,
  });
  const saveCamera = useCallback(
    (camera: [number, number, number], target: [number, number, number]) => {
      setCameraState((old) =>
        old.camera?.every((v, i) => Math.abs(v - camera[i]) < 0.00001) &&
        old.target?.every((v, i) => Math.abs(v - target[i]) < 0.00001)
          ? old
          : { camera, target },
      );
    },
    [],
  );
  const [initialView] = useState(() => initialSession);
  useEffect(() => {
    onSelectBody(selected);
    onSessionChange({ selected, day, tracking, falseColor, ...cameraState });
  }, [
    selected,
    day,
    tracking,
    falseColor,
    cameraState,
    onSelectBody,
    onSessionChange,
  ]);
  const select = useCallback(
    (name: string) => {
      setFocusVersion((v) => v + 1);
      setSelected(name);
      setPlaying(false);
      setTracking(true);
      setProgress(0);
      if (name === "Moon" && unavailable) onEnterMoon();
      else setFlying(name === "Moon");
    },
    [unavailable, onEnterMoon],
  );
  const onStatus = useCallback(
    (name: string, status: string) =>
      setStatuses((current) =>
        current[name] === status ? current : { ...current, [name]: status },
      ),
    [],
  );
  const body = solarBodies.find((item) => item.name === selected)!;
  return (
    <div className="solar-layout cinematic-solar" data-flying={flying}>
      <section
        className="solar-stage panel"
        aria-label="Interactive Solar System"
      >
        <div className="stage-heading">
          <span className="eyebrow">
            HORIZON 89 / INTERPLANETARY EXPLORATION
          </span>
          <h1>
            The Solar System<span className="red">.</span>
          </h1>
          <p>
            Explore the planets. Select the Moon. Enter lunar mission control.
          </p>
          <span className="badge cyan">
            NOT TO SCALE · SCHEMATIC ORBITS · NOT LIVE POSITIONS
          </span>
        </div>
        <SceneBoundary
          key={attempt}
          onFailure={markUnavailable}
          fallback={<SolarFallback onEnterMoon={onEnterMoon} onRetry={retry} />}
        >
          {unavailable ? (
            <SolarFallback onEnterMoon={onEnterMoon} onRetry={retry} />
          ) : (
            <Canvas
              frameloop={visible ? "demand" : "never"}
              shadows={quality === "high"}
              camera={{ position: [18, 14, 18], fov: 45 }}
              dpr={[1, quality === "low" ? 1 : quality === "high" ? 1.5 : 1.25]}
              gl={{
                powerPreference: "low-power",
                antialias: quality !== "low",
              }}
              fallback={
                <SolarFallback onEnterMoon={onEnterMoon} onRetry={retry} />
              }
            >
              <Scene
                onContextLost={markUnavailable}
                playing={playing}
                visible={visible}
                onDay={setDay}
                initialSession={initialView}
                onCamera={saveCamera}
                selected={selected}
                day={day}
                onSelect={select}
                tracking={tracking}
                flying={flying}
                onArrive={onEnterMoon}
                onProgress={setProgress}
                quality={quality}
                falseColor={falseColor}
                onStatus={onStatus}
                reduced={reduced}
                moonImage={moonImage}
                focusVersion={focusVersion}
              />
            </Canvas>
          )}
        </SceneBoundary>
        <div className="solar-controls">
          <button
            disabled={flying || reduced || unavailable}
            title={
              reduced
                ? "Motion disabled by reduced-motion preference"
                : undefined
            }
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? "Pause orbits" : "Play orbits"}
          </button>
          <button
            disabled={flying}
            onClick={() => {
              setDay(0);
              setFocusVersion((v) => v + 1);
              setSelected("Sun");
              setPlaying(false);
              setTracking(true);
            }}
          >
            Reset atlas
          </button>
          <button
            disabled={flying}
            aria-pressed={tracking}
            onClick={() => setTracking((v) => !v)}
          >
            {tracking ? "Follow selected object" : "Free camera"}
          </button>
          <select
            aria-label="Solar graphics quality"
            value={quality}
            onChange={(e) => onQualityChange(e.target.value as Quality)}
          >
            <option value="low">Low power</option>
            <option value="medium">Balanced</option>
            <option value="high">High detail</option>
          </select>
          <span className="mono">SCHEMATIC DAY {Math.floor(day)}</span>
        </div>
        <div className="solar-entry-caption">
          Drag to orbit · scroll/pinch to zoom · right-drag to pan
          <br />
          Schematic sizes, distances, orbital phases & visual spin rates
          <br />
          Decorative starfield & atmospheric rims · historical source maps
        </div>
        <a
          className="solar-background-credit"
          href="/images/space-provenance.json"
          target="_blank"
          rel="noreferrer"
        >
          NASA Tycho Star Map · decorative background ↗
        </a>
        {flying && (
          <div className="moon-flight" role="status">
            <span className="eyebrow">DESTINATION / MOON</span>
            <h2>Approaching lunar Mission Control</h2>
            <progress
              max={1}
              value={progress}
              aria-label="Moon fly-in progress"
            />
            <p>Cinematic camera travel · not a trajectory calculation</p>
            <button onClick={() => setFlying(false)}>Cancel approach</button>
          </div>
        )}
      </section>
      <aside className="solar-info panel">
        <span className="eyebrow">SELECT A DESTINATION / 10 OBJECTS</span>
        <div className="object-list">
          {solarBodies.map((item) => (
            <button
              key={item.name}
              disabled={flying}
              aria-pressed={selected === item.name}
              className={selected === item.name ? "active" : ""}
              onClick={() => select(item.name)}
            >
              <i style={{ background: item.color }} />
              {item.name}
            </button>
          ))}
        </div>
        <div className="solar-selected">
          <span className="eyebrow">
            {selected === "Moon"
              ? "LUNAR OPERATIONS GATEWAY"
              : "SELECTED OBJECT"}
          </span>
          <h2>{body.name}</h2>
          <p>{body.fact}</p>
          <p className="muted">
            {body.period
              ? `Approximate orbital period: ${body.period.toLocaleString()} Earth days.`
              : "Our star · emissive material, not a solar photograph."}
          </p>
          <p className="texture-status" role="status">
            {unavailable
              ? "3D unavailable · use the directory and source notes"
              : (statuses[selected] ?? "Preparing scene…")}
          </p>
          <small>
            {selected === "Moon" && moonImage.state === "available"
              ? "Requested LROC WAC 008P · 8 px/degree · context imagery, not elevation"
              : selected === "Mercury" &&
                  statuses.Mercury?.startsWith("Local GLB model loaded")
                ? "User-supplied geometry/materials · display scale normalized · source, axes and scientific registration not verified"
                : imageryNotes[selected]}
          </small>
          {selected === "Venus" && (
            <label className="venus-mode">
              <input
                type="checkbox"
                checked={falseColor}
                onChange={(e) => setFalseColor(e.target.checked)}
              />
              Show false-color surface (not clouds)
            </label>
          )}
          {selected === "Moon" && (
            <button
              className="primary enter-moon"
              disabled={flying}
              onClick={() => select("Moon")}
            >
              Enter lunar Mission Control ↗
            </button>
          )}
          <details>
            <summary>Texture source & limitations</summary>
            <p>
              {selected === "Mercury" &&
              statuses.Mercury?.startsWith("Local GLB model loaded")
                ? "The local GLB preserves authored materials and orientation. Its bounding box is centered and largest dimension fitted to the schematic planet diameter. Rotation is illustrative, not a measured orientation. No NASA attribution is inferred from the filename."
                : planetTexturePaths[selected]
                  ? "Pinned NASA source maps, dimensions, SHA-256 and usage notes are recorded in the local imagery manifest. Original instrument/acquisition metadata is incomplete for NASA 3D Resources assets."
                  : "No reviewed surface map imported for this object. Solid material is a labeled fallback, not fabricated imagery."}
            </p>
            <a
              href="/textures/planets/provenance.json"
              target="_blank"
              rel="noreferrer"
            >
              View texture provenance manifest ↗
            </a>
          </details>
          <a href={body.source} target="_blank" rel="noreferrer">
            NASA object reference ↗
          </a>
        </div>
      </aside>
    </div>
  );
}
