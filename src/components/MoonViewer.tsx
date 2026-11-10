import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as Controls } from "three-stdlib";
import * as THREE from "three";
import type { Coordinates } from "../data/catalog";
import { surfaceVector } from "../lib/science";
import { useScenePreferences } from "../lib/useScenePreferences";
import SceneBoundary from "./SceneBoundary";
import type { LunarImage } from "./LunarImagery";
import type { TerrainTile } from "../science/terrain";
import type { TerrainLayers } from "./TerrainPanel";
interface Props {
  image: LunarImage;
  site: Coordinates | null;
  grid: boolean;
  quality: "low" | "medium" | "high";
  view: { mode: "global" | "site" | "zoomIn" | "zoomOut"; version: number };
  markerKind: "study" | "verified";
  onPick: (site: Coordinates) => void;
  terrainTile: TerrainTile | null;
  terrainLayers: TerrainLayers;
}
function Grid() {
  const geometry = useMemo(() => {
    const points: number[] = [];
    function segment(a: Coordinates, b: Coordinates) {
      points.push(...surfaceVector(a, 1.003), ...surfaceVector(b, 1.003));
    }
    for (let lat = -75; lat <= 75; lat += 15)
      for (let lon = -180; lon < 180; lon += 3)
        segment(
          { latitude: lat, longitude: lon },
          { latitude: lat, longitude: lon + 3 },
        );
    for (let lon = -180; lon < 180; lon += 30)
      for (let lat = -90; lat < 90; lat += 3)
        segment(
          { latitude: lat, longitude: lon },
          { latitude: lat + 3, longitude: lon },
        );
    return new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#73d6df" transparent opacity={0.22} />
    </lineSegments>
  );
}

function TerrainOverlay({
  tile,
  layers,
}: {
  tile: TerrainTile;
  layers: TerrainLayers;
}) {
  const geometry = useMemo(() => {
    const values = layers.slope ? tile.slopes : tile.elevations,
      valid = values.filter((v): v is number => v !== null);
    const min = valid.length ? Math.min(...valid) : 0,
      max = valid.length ? Math.max(...valid) : 1,
      positions: number[] = [],
      colors: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value === null) continue;
      const x = i % tile.width,
        y = Math.floor(i / tile.width);
      positions.push(
        ...surfaceVector(
          {
            latitude:
              tile.bounds.north -
              (y / (tile.height - 1)) * (tile.bounds.north - tile.bounds.south),
            longitude:
              tile.bounds.west +
              (x / (tile.width - 1)) * (tile.bounds.east - tile.bounds.west),
          },
          1.008,
        ),
      );
      const t = (value - min) / (max - min || 1);
      colors.push(0.1 + t * 0.7, 0.3 + t * 0.5, 0.4 + t * 0.4);
    }
    return new THREE.BufferGeometry()
      .setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
      .setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }, [tile, layers]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.009}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

function Scene({
  site,
  grid,
  quality,
  view,
  onPick,
  onStatus,
  terrainTile,
  terrainLayers,
  markerKind,
  image,
}: { onStatus: (status: string) => void } & Props) {
  const { reduced } = useScenePreferences();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const controls = useRef<Controls>(null);
  const { camera, invalidate, gl } = useThree();
  useEffect(() => {
    let active = true;
    let loaded: THREE.Texture | undefined;
    const loader = new THREE.TextureLoader();
    loader.load(
      image.url,
      (map) => {
        loaded = map;
        if (!active) {
          map.dispose();
          return;
        }
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 4;
        setTexture(map);
        onStatus(
          image.state === "available"
            ? "LROC WAC imagery loaded · 2880 × 1440"
            : "Imagery loaded · 1024 × 512",
        );
        invalidate();
      },
      undefined,
      () => {
        if (active)
          onStatus("Texture unavailable · untextured sphere fallback");
      },
    );
    return () => {
      active = false;
      loaded?.dispose();
    };
  }, [invalidate, onStatus, image.url, image.state]);
  useEffect(() => {
    if (view.mode === "zoomIn" || view.mode === "zoomOut") {
      const target = controls.current?.target ?? new THREE.Vector3();
      const offset = camera.position.clone().sub(target);
      const distance = THREE.MathUtils.clamp(
        offset.length() * (view.mode === "zoomIn" ? 0.8 : 1.25),
        1.35,
        7,
      );
      camera.position
        .copy(target)
        .add(offset.normalize().multiplyScalar(distance));
      controls.current?.update();
      invalidate();
      return;
    }
    const position =
      view.mode === "site" && site ? surfaceVector(site, 3.7) : [3.5, 1.2, 2.5];
    camera.position.set(position[0], position[1], position[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [view, site, camera, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onStatus("WebGL context lost · reload viewer to restore");
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onStatus]);
  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 3, 5]} intensity={2} />
      <mesh
        onDoubleClick={(event) => {
          event.stopPropagation();
          const p = event.point.clone().normalize();
          onPick({
            latitude: (Math.asin(p.y) * 180) / Math.PI,
            longitude: (Math.atan2(-p.z, p.x) * 180) / Math.PI,
          });
        }}
      >
        <sphereGeometry
          args={[1, quality === "low" ? 48 : 96, quality === "low" ? 32 : 64]}
        />
        <meshStandardMaterial
          key={texture?.uuid ?? "untextured"}
          map={texture}
          color={texture ? "#ffffff" : "#96989c"}
          roughness={1}
        />
      </mesh>
      {grid && <Grid />}
      {terrainTile && (terrainLayers.elevation || terrainLayers.slope) && (
        <TerrainOverlay tile={terrainTile} layers={terrainLayers} />
      )}
      {site && (
        <mesh position={surfaceVector(site, 1.012)}>
          <sphereGeometry args={[0.014, 12, 12]} />
          <meshBasicMaterial
            color={markerKind === "verified" ? "#fa3b55" : "#61edff"}
          />
        </mesh>
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={!reduced}
        enablePan
        minDistance={1.35}
        maxDistance={7}
        rotateSpeed={0.55}
      />
    </>
  );
}
export default function MoonViewer(props: Props) {
  const { visible } = useScenePreferences();
  const [status, setStatus] = useState("Loading lunar imagery…");
  const [attempt, setAttempt] = useState(0);
  const fallback = (
    <div className="scene-fallback">
      <img
        src={props.image.url}
        alt="Equirectangular lunar surface image map"
      />
      <strong>3D rendering unavailable</strong>
      <p>The image map remains available. Try reloading or enabling WebGL.</p>
    </div>
  );
  return (
    <>
      <SceneBoundary
        key={attempt}
        fallback={fallback}
        onFailure={() =>
          setStatus("3D rendering unavailable · reload viewer to retry")
        }
      >
        <Canvas
          frameloop={visible ? "demand" : "never"}
          camera={{ position: [3.5, 1.2, 2.5], fov: 34 }}
          dpr={[
            1,
            props.quality === "high"
              ? 1.7
              : props.quality === "medium"
                ? 1.25
                : 1,
          ]}
          gl={{
            antialias: props.quality !== "low",
            powerPreference: "low-power",
            preserveDrawingBuffer: true,
          }}
          fallback={fallback}
        >
          <Scene {...props} onStatus={setStatus} />
        </Canvas>
      </SceneBoundary>
      {props.terrainTile &&
        (props.terrainLayers.elevation || props.terrainLayers.slope) && (
          <div className="terrain-layer-caption">
            DEM {props.terrainLayers.slope ? "SLOPE (°)" : "ELEVATION (m)"} ·
            COLOR OVERLAY · NO DISPLACEMENT
          </div>
        )}
      <div className="render-status" role="status">
        {status}
        {(status.includes("unavailable") || status.includes("lost")) && (
          <button
            onClick={() => {
              setAttempt((v) => v + 1);
              setStatus("Loading lunar imagery…");
            }}
          >
            Reload viewer
          </button>
        )}
      </div>
    </>
  );
}
