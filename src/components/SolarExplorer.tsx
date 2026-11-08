import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as Controls } from "three-stdlib";
import * as THREE from "three";
import { solarBodies } from "../data/catalog";
import SceneBoundary from "./SceneBoundary";
function position(name: string, day: number): [number, number, number] {
  const index = solarBodies.findIndex((body) => body.name === name),
    body = solarBodies[index];
  if (name === "Moon") {
    const earth = position("Earth", day),
      angle = (day / 27.32) * Math.PI * 2;
    return [
      earth[0] + 0.62 * Math.cos(angle),
      0.05,
      earth[2] + 0.62 * Math.sin(angle),
    ];
  }
  const angle =
    (body.period ? (day / body.period) * 2 * Math.PI : 0) + index * 0.8;
  return [Math.cos(angle) * body.orbit, 0, Math.sin(angle) * body.orbit];
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
      <lineBasicMaterial color="#647078" transparent opacity={0.3} />
    </lineLoop>
  );
}
function Scene({
  selected,
  day,
  onSelect,
  tracking,
}: {
  selected: string;
  day: number;
  onSelect: (name: string) => void;
  tracking: boolean;
}) {
  const { camera, invalidate } = useThree();
  const controls = useRef<Controls>(null);
  const lastFocus = useRef("");
  useEffect(() => {
    if (!tracking && lastFocus.current === selected) return;
    lastFocus.current = selected;
    const p = position(selected, day);
    const body = solarBodies.find((b) => b.name === selected)!;
    const d = selected === "Sun" ? 22 : Math.max(2, body.radius * 6);
    camera.position.set(p[0] + d, p[1] + d * 0.7, p[2] + d);
    controls.current?.target.set(...p);
    controls.current?.update();
    invalidate();
  }, [selected, day, camera, invalidate, tracking]);
  useEffect(() => {
    invalidate();
  }, [day, invalidate]);
  return (
    <>
      <ambientLight intensity={1.6} />
      <pointLight position={[0, 0, 0]} intensity={50} />
      {solarBodies
        .filter((b) => b.orbit && b.name !== "Moon")
        .map((body) => (
          <Orbit key={body.name} radius={body.orbit} />
        ))}
      {solarBodies.map((body) => (
        <group key={body.name} position={position(body.name, day)}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelect(body.name);
            }}
          >
            <sphereGeometry args={[body.radius, 32, 24]} />
            <meshStandardMaterial
              color={body.color}
              emissive={body.name === "Sun" ? body.color : "#000000"}
              emissiveIntensity={body.name === "Sun" ? 1 : 0}
              roughness={1}
            />
          </mesh>
          {body.name === "Saturn" && (
            <mesh rotation={[-Math.PI / 2, 0.15, 0]}>
              <ringGeometry args={[0.8, 1.2, 64]} />
              <meshStandardMaterial
                color="#bca983"
                side={THREE.DoubleSide}
                transparent
                opacity={0.65}
              />
            </mesh>
          )}
          {body.name === selected && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[body.radius * 1.25, body.radius * 1.3, 48]}
              />
              <meshBasicMaterial color="#63e6f1" side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        minDistance={0.5}
        maxDistance={45}
      />
    </>
  );
}
export default function SolarExplorer({
  onSelectBody,
}: {
  onSelectBody: (name: string) => void;
}) {
  const [selected, setSelected] = useState("Sun"),
    [day, setDay] = useState(0),
    [playing, setPlaying] = useState(false),
    [tracking, setTracking] = useState(true);
  useEffect(() => {
    onSelectBody(selected);
  }, [selected, onSelectBody]);
  const body = solarBodies.find((item) => item.name === selected)!;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setDay((value) => value + 1), 100);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <div className="solar-layout">
      <section className="solar-stage panel">
        <div className="stage-heading">
          <span className="eyebrow">02 / ORBITAL ATLAS</span>
          <h1>
            The Solar System<span className="red">.</span>
          </h1>
          <p>
            Schematic motion · compressed distances & sizes · arbitrary starting
            phases
          </p>
        </div>
        <SceneBoundary
          fallback={
            <div className="scene-fallback">
              WebGL unavailable. Select objects below to explore their
              information.
            </div>
          }
        >
          <Canvas
            frameloop="demand"
            camera={{ position: [18, 14, 18], fov: 45 }}
            dpr={[1, 1.25]}
            gl={{ powerPreference: "low-power" }}
          >
            <Scene
              selected={selected}
              day={day}
              onSelect={setSelected}
              tracking={tracking}
            />
          </Canvas>
        </SceneBoundary>
        <div className="solar-controls">
          <button onClick={() => setPlaying((v) => !v)}>
            {playing ? "Pause orbits" : "Play orbits"}
          </button>
          <button
            onClick={() => {
              setDay(0);
              setPlaying(false);
              setSelected("Sun");
              setTracking(true);
            }}
          >
            Reset atlas
          </button>
          <button
            aria-pressed={tracking}
            onClick={() => setTracking((v) => !v)}
          >
            {tracking ? "Follow selected object" : "Free camera"}
          </button>
          <span className="mono">SCHEMATIC DAY {day}</span>
        </div>
      </section>
      <aside className="solar-info panel">
        <span className="eyebrow">OBJECT DIRECTORY</span>
        <div className="object-list">
          {solarBodies.map((item) => (
            <button
              aria-pressed={selected === item.name}
              className={selected === item.name ? "active" : ""}
              key={item.name}
              onClick={() => setSelected(item.name)}
            >
              <i style={{ background: item.color }} />
              {item.name}
            </button>
          ))}
        </div>
        <h2>{body.name}</h2>
        <p>{body.fact}</p>
        <p className="muted">
          {body.period
            ? `Approximate orbital period: ${body.period.toLocaleString()} Earth days.`
            : "The central star of this schematic."}
        </p>
        <a href={body.source} target="_blank" rel="noreferrer">
          NASA object reference ↗
        </a>
        <div className="notice">
          Positions are illustrative. Circular coplanar guides and exaggerated
          body sizes are for exploration, not navigation. Moon orbit shown
          relative to Earth. No real-time ephemerides.
        </div>
      </aside>
    </div>
  );
}
