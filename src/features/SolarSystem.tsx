import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ArrowLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import './solar.css';

type Planet = {
  name: string;
  kind: string;
  radius: number;
  orbit: number;
  period: number;
  phase: number;
  tilt: number;
  color: string;
  accent: string;
  description: string;
  fact: string;
};

// Distances, apparent sizes and orbital speeds are adjusted for legibility.
// These positions are an illustration, not ephemeris or mission navigation data.
const PLANETS: Planet[] = [
  { name: 'Mercury', kind: 'TERRESTRIAL', radius: .19, orbit: 2.45, period: 1.55, phase: 1.8, tilt: .04, color: '#918c86', accent: '#d1cbc2', description: 'An airless rocky world with a heavily cratered surface.', fact: 'Closest planet to the Sun' },
  { name: 'Venus', kind: 'TERRESTRIAL', radius: .33, orbit: 3.65, period: 1.2, phase: 4.0, tilt: .04, color: '#dcb981', accent: '#fff0cf', description: 'A world wrapped in thick, reflective clouds.', fact: 'Dense carbon dioxide atmosphere' },
  { name: 'Earth', kind: 'TERRESTRIAL', radius: .37, orbit: 5.0, period: 1, phase: 2.2, tilt: .41, color: '#2777af', accent: '#79dbe5', description: 'Our ocean world, seen here as a procedural illustration.', fact: 'Home to the Moon' },
  { name: 'Mars', kind: 'TERRESTRIAL', radius: .27, orbit: 6.35, period: .81, phase: .6, tilt: .44, color: '#ad563a', accent: '#ee9678', description: 'A cold desert planet with ancient surface features.', fact: 'The red planet' },
  { name: 'Jupiter', kind: 'GAS GIANT', radius: .84, orbit: 8.6, period: .44, phase: 3.3, tilt: .05, color: '#caa988', accent: '#f0d0a8', description: 'The largest planet, with broad atmospheric cloud bands.', fact: 'Largest planet in our Solar System' },
  { name: 'Saturn', kind: 'GAS GIANT', radius: .68, orbit: 11.25, period: .33, phase: 5.4, tilt: .47, color: '#d6c39b', accent: '#f1dcb5', description: 'An immense gas giant surrounded by a bright ring system.', fact: 'Famous for its rings' },
  { name: 'Uranus', kind: 'ICE GIANT', radius: .48, orbit: 13.75, period: .24, phase: 1.0, tilt: 1.71, color: '#a4d7dc', accent: '#d7f6ef', description: 'A pale cyan ice giant with an extreme axial tilt.', fact: 'Rotates nearly on its side' },
  { name: 'Neptune', kind: 'ICE GIANT', radius: .47, orbit: 16.25, period: .19, phase: 4.5, tilt: .49, color: '#3757ae', accent: '#8dadff', description: 'A distant blue ice giant with a dynamic atmosphere.', fact: 'Farthest major planet from the Sun' },
];

type Selection = 'Sun' | 'Moon' | Planet['name'];
const ROTATION_RATE = .075;

function positionFor(planet: Planet, time: number): [number, number, number] {
  const a = planet.phase + time * planet.period * ROTATION_RATE;
  return [Math.cos(a) * planet.orbit, Math.sin(a * 1.6) * .035, Math.sin(a) * planet.orbit];
}

let earthCanvasCache: HTMLCanvasElement | null = null;

function makeEarthCanvas(): HTMLCanvasElement {
  if (earthCanvasCache) return earthCanvasCache;
  const width = 768;
  const height = 384;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');

  // Rough geographic silhouettes give the artwork recognisable structure.
  // They are intentionally not a cartographic dataset or terrain source.
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext('2d');
  if (!maskContext) throw new Error('Canvas 2D is unavailable');
  const continents: [number, number][][] = [
    [[-168, 66], [-150, 72], [-137, 69], [-125, 62], [-111, 67], [-95, 72], [-78, 66], [-60, 57], [-53, 48], [-67, 45], [-76, 36], [-82, 27], [-90, 24], [-97, 17], [-105, 20], [-108, 30], [-118, 32], [-123, 39], [-128, 49], [-139, 55], [-157, 57]],
    [[-81, 12], [-72, 11], [-63, 13], [-53, 8], [-47, 2], [-37, -5], [-36, -13], [-43, -22], [-47, -30], [-54, -36], [-68, -54], [-76, -51], [-74, -39], [-79, -27], [-77, -14], [-81, -4]],
    [[-17, 36], [-5, 37], [10, 36], [26, 32], [35, 29], [43, 14], [50, 11], [44, -7], [40, -18], [34, -28], [18, -35], [11, -34], [9, -23], [2, -15], [-8, -1], [-17, 12]],
    [[-11, 35], [-10, 44], [-22, 55], [-6, 60], [15, 70], [37, 72], [53, 62], [79, 73], [109, 72], [136, 64], [170, 59], [178, 50], [162, 43], [148, 35], [134, 32], [120, 20], [117, 12], [107, 10], [105, 2], [100, -5], [98, 8], [86, 18], [75, 9], [68, 23], [58, 27], [50, 30], [42, 35], [31, 37], [26, 43], [18, 40], [10, 44], [2, 37]],
    [[112, -12], [128, -10], [142, -12], [153, -24], [146, -36], [132, -39], [114, -34], [112, -23]],
    [[-53, 60], [-46, 72], [-40, 82], [-27, 81], [-35, 66], [-43, 58]],
    [[-180, -76], [-149, -71], [-110, -74], [-70, -69], [-29, -73], [9, -70], [44, -72], [87, -68], [130, -72], [180, -76], [180, -90], [-180, -90]],
    [[46, -14], [51, -15], [49, -26], [44, -25]],
    [[131, 33], [139, 40], [143, 44], [147, 42], [141, 32]],
    [[-9, 50], [-2, 59], [2, 55], [-4, 50]],
  ];
  const mapX = (lon: number) => ((lon + 180) / 360) * width;
  const mapY = (lat: number) => ((90 - lat) / 180) * height;
  maskContext.fillStyle = '#fff';
  for (const polygon of continents) {
    maskContext.beginPath();
    polygon.forEach(([lon, lat], index) => {
      const x = mapX(lon), y = mapY(lat);
      if (index === 0) maskContext.moveTo(x, y);
      else maskContext.lineTo(x, y);
    });
    maskContext.closePath();
    maskContext.fill();
  }
  const softMask = document.createElement('canvas');
  softMask.width = width;
  softMask.height = height;
  const softContext = softMask.getContext('2d');
  if (!softContext) throw new Error('Canvas 2D is unavailable');
  softContext.filter = 'blur(2px)';
  softContext.drawImage(mask, 0, 0);
  const land = softContext.getImageData(0, 0, width, height).data;
  const pixels = context.createImageData(width, height);

  const hash = (x: number, y: number) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + 1376312589;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, frequency: number) => {
    const xx = x / width * frequency, yy = y / height * frequency;
    const ix = Math.floor(xx), iy = Math.floor(yy);
    const fx = xx - ix, fy = yy - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const h00 = hash(ix, iy), h10 = hash(ix + 1, iy);
    const h01 = hash(ix, iy + 1), h11 = hash(ix + 1, iy + 1);
    return (h00 + (h10 - h00) * sx) * (1 - sy) + (h01 + (h11 - h01) * sx) * sy;
  };
  for (let y = 0; y < height; y++) {
    const latitude = 90 - y / height * 180;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const longitude = x / width * 360 - 180;
      const broad = noise(x, y, 10);
      const detail = noise(x, y, 37);
      const fine = noise(x, y, 94);
      const variation = broad * .55 + detail * .32 + fine * .13;
      const edge = land[i + 3] / 255;
      const landPixel = edge > (.44 + (detail - .5) * .3);
      let red: number, green: number, blue: number;
      if (landPixel) {
        const desert = ((longitude > -16 && longitude < 52 && latitude > 11 && latitude < 37) || (longitude > 115 && longitude < 148 && latitude < -13 && latitude > -31) || (longitude > 39 && longitude < 62 && latitude > 17 && latitude < 33));
        const ice = Math.abs(latitude) > 69 || (Math.abs(latitude) > 55 && variation > .7);
        if (ice) { red = 202 + variation * 38; green = 211 + variation * 36; blue = 215 + variation * 34; }
        else if (desert) { red = 128 + variation * 53; green = 103 + variation * 46; blue = 68 + variation * 35; }
        else { red = 28 + variation * 75; green = 67 + variation * 81; blue = 42 + variation * 54; }
      } else {
        const shallow = edge > .07 ? edge * .4 : 0;
        red = 5 + variation * 15 + shallow * 14;
        green = 25 + variation * 48 + shallow * 47;
        blue = 57 + variation * 66 + shallow * 52;
      }
      const cloud = noise(x + 137, y + 71, 17) * .5 + noise(x + 37, y + 91, 44) * .33 + noise(x + 89, y + 16, 113) * .17;
      const cloudAlpha = Math.max(0, Math.min(.58, (cloud - .585) * 5.7));
      red = red * (1 - cloudAlpha) + 242 * cloudAlpha;
      green = green * (1 - cloudAlpha) + 247 * cloudAlpha;
      blue = blue * (1 - cloudAlpha) + 251 * cloudAlpha;
      pixels.data[i] = red;
      pixels.data[i + 1] = green;
      pixels.data[i + 2] = blue;
      pixels.data[i + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  earthCanvasCache = canvas;
  return canvas;
}

function makePlanetTexture(planet: Planet): THREE.CanvasTexture {
  const canvas = planet.name === 'Earth' ? makeEarthCanvas() : document.createElement('canvas');
  if (planet.name === 'Earth') {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.fillStyle = planet.color;
  ctx.fillRect(0, 0, 512, 256);
  let seed = PLANETS.findIndex((item) => item.name === planet.name) + 9;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  if (planet.kind !== 'TERRESTRIAL' || planet.name === 'Venus') {
    for (let i = 0; i < 56; i++) {
      const y = i * 5 + rand() * 7;
      ctx.fillStyle = i % 4 === 0 ? planet.accent : i % 3 === 0 ? '#594d60' : '#ffffff';
      ctx.globalAlpha = .035 + rand() * .12;
      ctx.fillRect(0, y, 512, 1 + rand() * 9);
    }
    ctx.globalAlpha = 1;
    if (planet.name === 'Jupiter') {
      ctx.fillStyle = '#a8664a'; ctx.globalAlpha = .66;
      ctx.beginPath(); ctx.ellipse(335, 153, 42, 15, -.15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    for (let i = 0; i < 190; i++) {
      const x = rand() * 512, y = rand() * 256;
      const r = rand() * 11 + 2;
      ctx.fillStyle = planet.accent;
      ctx.globalAlpha = .05 + rand() * .16;
      ctx.beginPath(); ctx.ellipse(x, y, r, r, rand() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function OrbitPath({ radius, color = '#b9c7e1' }: { radius: number; color?: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - .012, radius + .012, 144]} />
      <meshBasicMaterial color={color} transparent opacity={.19} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function SceneLabel({ name, position, selected = false, scale = 1 }: { name: string; position: [number, number, number]; selected?: boolean; scale?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    context.font = '700 25px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = '#020716';
    context.shadowBlur = 10;
    context.fillStyle = selected ? '#9de8fa' : '#d8e5f5';
    context.fillText(name, 128, 32);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [name, selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[1.5 * scale, .375 * scale, 1]}><spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} /></sprite>;
}

function Sun({ select }: { select: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => { if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * .035; });
  return (
    <group>
      <mesh ref={ref} onClick={(event) => { event.stopPropagation(); select(); }}>
        <sphereGeometry args={[1.02, 40, 24]} />
        <meshStandardMaterial color="#ffce71" emissive="#ff9b35" emissiveIntensity={1.35} roughness={1} />
      </mesh>
      <mesh scale={1.29}><sphereGeometry args={[1.02, 32, 24]} /><meshBasicMaterial color="#ffc769" transparent opacity={.10} depthWrite={false} /></mesh>
      <mesh scale={1.72}><sphereGeometry args={[1.02, 32, 24]} /><meshBasicMaterial color="#ff7b40" transparent opacity={.035} depthWrite={false} /></mesh>
      <SceneLabel name="SUN" position={[0, 1.6, 0]} />
    </group>
  );
}

function PlanetBody({ planet, time, selected, onSelect, onMoon }: {
  planet: Planet; time: React.RefObject<number>; selected: boolean; onSelect: () => void; onMoon: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => makePlanetTexture(planet), [planet]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    if (group.current) group.current.position.set(...positionFor(planet, time.current));
    if (mesh.current) mesh.current.rotation.y += Math.min(delta, .05) * .11;
  });
  return (
    <group ref={group} position={positionFor(planet, 0)} rotation={[0, 0, planet.tilt]}>
      <mesh ref={mesh} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[planet.radius, 32, 24]} />
        <meshStandardMaterial map={texture} roughness={.88} metalness={0} />
      </mesh>
      {planet.name === 'Earth' && <mesh scale={1.07}><sphereGeometry args={[planet.radius, 32, 24]} /><meshBasicMaterial color="#8dd9ff" transparent opacity={.14} depthWrite={false} /></mesh>}
      {planet.name === 'Saturn' && (
        <group rotation={[-.5, .2, .2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[planet.radius * 1.27, planet.radius * 1.83, 96]} /><meshStandardMaterial color="#d8c69f" transparent opacity={.55} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[planet.radius * 1.95, planet.radius * 2.22, 96]} /><meshStandardMaterial color="#c2b69e" transparent opacity={.34} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        </group>
      )}
      {planet.name === 'Earth' && (
        <group position={[planet.radius * 2.1, .07, 0]}>
          <mesh onClick={(event) => { event.stopPropagation(); onMoon(); }}><sphereGeometry args={[.13, 24, 16]} /><meshStandardMaterial color="#c5c2bd" roughness={1} /></mesh>
          <SceneLabel name="MOON" position={[0, .3, 0]} scale={.6} />
        </group>
      )}
      <SceneLabel name={planet.name.toUpperCase()} position={[0, Math.max(.34, planet.radius + .3), 0]} selected={selected} />
    </group>
  );
}

function CameraRig({ selection, time, reducedMotion, focusVersion }: { selection: Selection | null; time: React.RefObject<number>; reducedMotion: boolean; focusVersion: number }) {
  const { camera } = useThree();
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const progress = useRef(1);
  useEffect(() => { progress.current = 0; }, [focusVersion]);
  useFrame((_, delta) => {
    if (progress.current >= 1 || !controls.current) return;
    progress.current = Math.min(1, progress.current + (reducedMotion ? 1 : delta * 1.1));
    const planet = PLANETS.find((item) => item.name === selection);
    const target = planet ? new THREE.Vector3(...positionFor(planet, time.current)) : new THREE.Vector3(0, 0, 0);
    const distance = planet ? Math.max(2.8, planet.radius * 5.2) : 37;
    const cameraGoal = planet ? target.clone().add(new THREE.Vector3(distance * .45, distance * .63, distance)) : new THREE.Vector3(0, 17, 35);
    const easing = reducedMotion ? 1 : Math.min(1, delta * 3.8);
    camera.position.lerp(cameraGoal, easing);
    controls.current.target.lerp(target, easing);
    controls.current.update();
  });
  return <OrbitControls ref={controls} enablePan enableZoom minDistance={1.7} maxDistance={60} maxPolarAngle={Math.PI * .88} makeDefault />;
}

function World({ selected, select, onMoon, playing, speed, reducedMotion, focusVersion }: {
  selected: Selection | null; select: (name: Selection) => void; onMoon: () => void;
  playing: boolean; speed: number; reducedMotion: boolean; focusVersion: number;
}) {
  const time = useRef(0);
  useFrame((_, delta) => { if (playing && !reducedMotion) time.current += Math.min(delta, .05) * speed; });
  return (
    <>
      <ambientLight intensity={.34} color="#b6c7f3" />
      <pointLight position={[0, 0, 0]} intensity={70} color="#fff0c8" distance={38} decay={2} />
      <Stars radius={90} depth={90} count={2200} factor={3.5} saturation={.4} fade speed={reducedMotion ? 0 : .1} />
      {PLANETS.map((planet) => <OrbitPath key={`path-${planet.name}`} radius={planet.orbit} />)}
      <OrbitPath radius={1.5} color="#ffb270" />
      <Sun select={() => select('Sun')} />
      {PLANETS.map((planet) => <PlanetBody key={planet.name} planet={planet} time={time} selected={selected === planet.name} onSelect={() => select(planet.name)} onMoon={onMoon} />)}
      <CameraRig selection={selected} time={time} reducedMotion={reducedMotion} focusVersion={focusVersion} />
    </>
  );
}

function HeroWorld({ onReady, reducedMotion }: { onReady?: () => void; reducedMotion: boolean }) {
  const earth = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const readyFrame = useRef<number | null>(null);
  const readyNotified = useRef(false);
  const earthTexture = useMemo(() => makePlanetTexture(PLANETS[2]), []);
  useEffect(() => () => earthTexture.dispose(), [earthTexture]);
  useEffect(() => () => {
    if (readyFrame.current !== null) window.cancelAnimationFrame(readyFrame.current);
    readyFrame.current = null;
  }, []);
  useFrame((state) => {
    if (!reducedMotion) {
      if (earth.current) earth.current.rotation.y = state.clock.elapsedTime * .025;
      if (moon.current) moon.current.rotation.y = state.clock.elapsedTime * .018;
    }
    if (!readyNotified.current && readyFrame.current === null && onReady) {
      readyFrame.current = window.requestAnimationFrame(() => {
        readyFrame.current = null;
        readyNotified.current = true;
        onReady();
      });
    }
  });
  return <>
    <ambientLight intensity={.3} color="#b4c6ff" />
    <directionalLight position={[-5, 3, 8]} intensity={3.1} color="#e7f4ff" />
    <pointLight position={[-5, 1, -4]} intensity={12} color="#ffb879" distance={30} />
    <Stars radius={70} depth={90} count={1700} factor={3.6} saturation={.4} fade speed={0} />
    <group position={[2.25, -.22, 0]} rotation={[.16, 0, -.2]}>
      <mesh ref={earth}><sphereGeometry args={[2.65, 48, 32]} /><meshStandardMaterial map={earthTexture} roughness={.9} /></mesh>
      <mesh scale={1.06}><sphereGeometry args={[2.65, 40, 32]} /><meshBasicMaterial color="#7fbfff" transparent opacity={.12} depthWrite={false} /></mesh>
      <mesh scale={1.14}><sphereGeometry args={[2.65, 40, 32]} /><meshBasicMaterial color="#2867bb" transparent opacity={.045} depthWrite={false} /></mesh>
    </group>
    <mesh ref={moon} position={[-2.35, 1.65, -2.5]}><sphereGeometry args={[.62, 32, 24]} /><meshStandardMaterial color="#b8b7b1" roughness={1} /></mesh>
  </>;
}

export default function SolarSystem({ onMoon, hero = false, onHeroReady }: { onMoon: () => void; hero?: boolean; onHeroReady?: () => void }) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const chosen = PLANETS.find((planet) => planet.name === selected);
  const choose = (name: Selection | null) => { setSelected(name); setFocusVersion((value) => value + 1); };
  if (hero) {
    return <div className="h89-solar-hero" aria-hidden="true"><Canvas camera={{ position: [0, 0, 11], fov: 52, near: .1, far: 180 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}><HeroWorld onReady={onHeroReady} reducedMotion={reducedMotion} /></Canvas></div>;
  }
  return (
    <section className="h89-solar" aria-label="Illustrative Solar System explorer">
      <div className="h89-solar-nebula" aria-hidden="true" />
      <div className="h89-solar-canvas">
        <Canvas camera={{ position: [0, 17, 35], fov: 54, near: .05, far: 220 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
          <World selected={selected} select={choose} onMoon={onMoon} playing={playing} speed={speed} reducedMotion={reducedMotion} focusVersion={focusVersion} />
        </Canvas>
      </div>
      <div className="h89-solar-scrim" aria-hidden="true" />
      <header className="h89-solar-top">
        <div className="h89-solar-kicker"><span className="h89-solar-dot" /> EXPLORATION / 01</div>
        <span className="h89-solar-state">ILLUSTRATIVE ORBITS <span className="h89-solar-separator">/</span> NOT EPHEMERIS</span>
      </header>
      <div className="h89-solar-content">
        <div className="h89-solar-eyebrow"><Sparkles size={14} /> THE NEIGHBOURHOOD</div>
        <h1>Eight worlds.<br /><em>One horizon.</em></h1>
        <p>Move through the planets, follow their paths, and journey toward the Moon. Distances and movement are scaled for exploration.</p>
        <div className="h89-solar-actions">
          <button type="button" className="h89-solar-primary" onClick={onMoon}>EXPLORE THE MOON <ChevronRight size={17} /></button>
          <span>Drag to orbit <span className="h89-solar-separator">·</span> Scroll to zoom</span>
        </div>
      </div>
      <div className="h89-solar-inspector" aria-live="polite">
        <div className="h89-solar-inspector-top">
          <span>OBJECT / {selected ? selected.toUpperCase() : 'SELECT A WORLD'}</span>
          {selected && <button type="button" onClick={() => choose(null)} aria-label="Return to full Solar System"><RotateCcw size={16} /></button>}
        </div>
        <div className="h89-solar-inspector-orb" style={{ '--world-color': chosen?.accent ?? (selected === 'Sun' ? '#ffcb79' : '#8599bb') } as React.CSSProperties} />
        <h2>{selected ?? 'Solar System'}</h2>
        <span className="h89-solar-type">{chosen?.kind ?? (selected === 'Sun' ? 'STAR' : 'INTERACTIVE EXPLORER')}</span>
        <p>{chosen?.description ?? (selected === 'Sun' ? 'The star at the centre of our Solar System. The glow in this scene is procedural artwork.' : 'Choose a planet from the scene or the world index to inspect it up close.')}</p>
        <div className="h89-solar-fact">{chosen?.fact ?? (selected === 'Sun' ? 'Centre of the Solar System' : 'Eight major planets · one Moon destination')}</div>
        {selected === 'Earth' && <button type="button" className="h89-solar-moon-link" onClick={onMoon}>TRAVEL TO THE MOON <ArrowLeft size={15} /></button>}
      </div>
      <div className="h89-solar-dock" aria-label="Solar System controls">
        <div className="h89-solar-worlds">
          <button type="button" className={selected === 'Sun' ? 'active' : ''} onClick={() => choose('Sun')}>SUN</button>
          {PLANETS.map((planet) => <button type="button" key={planet.name} className={selected === planet.name ? 'active' : ''} onClick={() => choose(planet.name)}>{planet.name.toUpperCase()}</button>)}
          <button type="button" onClick={onMoon}>MOON ↗</button>
        </div>
        <div className="h89-solar-time">
          <span>SCENE TIME</span>
          <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause orbital illustration' : 'Play orbital illustration'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          {[1, 5, 20].map((value) => <button type="button" key={value} className={speed === value ? 'active' : ''} onClick={() => setSpeed(value)} aria-label={`${value} times illustration speed`}>{value}×</button>)}
        </div>
      </div>
      <div className="h89-solar-method">PROCEDURAL ARTWORK · ORBITS AND SURFACE PATTERNS ARE ILLUSTRATIVE</div>
    </section>
  );
}
