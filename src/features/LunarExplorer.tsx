import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import { ArrowLeft, Compass, Crosshair, Layers3, MapPinned, Ruler, RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import type { LunarImage } from '../components/LunarImagery'
import { missions as historicalMissions } from '../data/catalog'
import './lunar.css'

type Coordinate = { lat: number; lon: number }
type MeasureStep = 'off' | 'first' | 'second'
type Preset = 'Near side' | 'Far side' | 'North pole' | 'South pole' | 'Selected point'

const MOON_MEAN_RADIUS_KM = 1737.4

const DATA_LAYERS = [
  { name: 'LOLA elevation', state: 'NOT IMPORTED', available: false, note: 'Elevation, slope, and roughness require a validated DEM.' },
  { name: 'Permanently shadowed regions', state: 'NOT IMPORTED', available: false, note: 'Boundaries must come from a sourced scientific product.' },
  { name: 'Solar illumination', state: 'NOT EVALUATED', available: false, note: 'Requires terrain and time-specific solar geometry.' },
  { name: 'Earth visibility', state: 'NOT EVALUATED', available: false, note: 'Requires time-specific geometry and terrain.' },
]

function pointOnGlobe({ lat, lon }: Coordinate, radius = 1.018): THREE.Vector3 {
  const latitude = THREE.MathUtils.degToRad(lat)
  const longitude = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.sin(longitude),
    radius * Math.sin(latitude),
    radius * Math.cos(latitude) * Math.cos(longitude),
  )
}

function coordinateFromPoint(point: THREE.Vector3): Coordinate {
  const unit = point.clone().normalize()
  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(unit.y, -1, 1))),
    lon: THREE.MathUtils.radToDeg(Math.atan2(unit.x, unit.z)),
  }
}

function distanceKm(a: Coordinate, b: Coordinate): number {
  const aLat = THREE.MathUtils.degToRad(a.lat)
  const bLat = THREE.MathUtils.degToRad(b.lat)
  const latDelta = bLat - aLat
  const lonDelta = THREE.MathUtils.degToRad(b.lon - a.lon)
  const haversine = Math.sin(latDelta / 2) ** 2 + Math.cos(aLat) * Math.cos(bLat) * Math.sin(lonDelta / 2) ** 2
  return 2 * MOON_MEAN_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

function GlobeGrid() {
  const lines = useMemo(() => {
    const results: THREE.Vector3[][] = []
    for (let lat = -75; lat <= 75; lat += 15) {
      const points = []
      for (let lon = -180; lon <= 180; lon += 3) points.push(pointOnGlobe({ lat, lon }, 1.006))
      results.push(points)
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const points = []
      for (let lat = -90; lat <= 90; lat += 3) points.push(pointOnGlobe({ lat, lon }, 1.007))
      results.push(points)
    }
    return results
  }, [])
  return <group>{lines.map((points, index) => <Line key={index} points={points} color="#bce5ff" transparent opacity={index < 11 ? 0.16 : 0.12} lineWidth={1} depthWrite={false} />)}</group>
}

function Marker({ coordinate, color, size = 0.022 }: { coordinate: Coordinate; color: string; size?: number }) {
  const position = useMemo(() => pointOnGlobe(coordinate, 1.025), [coordinate])
  return <group position={position}>
    <mesh><sphereGeometry args={[size, 14, 14]} /><meshBasicMaterial color={color} /></mesh>
    <mesh><ringGeometry args={[size * 1.8, size * 2.1, 32]} /><meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} /></mesh>
  </group>
}

function CameraRig({ preset, selected, revision }: { preset: Preset; selected: Coordinate; revision: number }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0, 4.5))
  const moving = useRef(false)
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const direction = preset === 'Far side' ? new THREE.Vector3(0, 0, -1)
      : preset === 'North pole' ? new THREE.Vector3(0, 1, 0.04)
        : preset === 'South pole' ? new THREE.Vector3(0, -1, 0.04)
          : preset === 'Selected point' ? pointOnGlobe(selected).normalize()
            : new THREE.Vector3(0, 0, 1)
    target.current = direction.normalize().multiplyScalar(4.5)
    moving.current = true
  }, [preset, selected, revision])
  useFrame(() => {
    if (!moving.current) return
    if (reducedMotion.current) camera.position.copy(target.current)
    else camera.position.lerp(target.current, 0.09)
    camera.lookAt(0, 0, 0)
    if (camera.position.distanceTo(target.current) < 0.012) moving.current = false
  })
  return <OrbitControls enableDamping dampingFactor={0.08} minDistance={1.5} maxDistance={7} enablePan={false} onStart={() => { moving.current = false }} />
}

function LunarScene({ selected, first, second, grid, preset, revision, onPoint, image }: {
  selected: Coordinate; first: Coordinate | null; second: Coordinate | null; grid: boolean; preset: Preset; revision: number; onPoint: (coordinate: Coordinate) => void; image: LunarImage
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let active = true
    let loaded: THREE.Texture | null = null
    new THREE.TextureLoader().load(image.url, (map) => {
      if (!active) { map.dispose(); return }
      map.colorSpace = THREE.SRGBColorSpace
      loaded = map
      setTexture(map)
    })
    return () => { active = false; loaded?.dispose() }
  }, [image.url])
  return <Canvas camera={{ position: [0, 0, 4.5], fov: 39 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
    <color attach="background" args={['#060d1e']} />
    <ambientLight intensity={0.52} />
    <directionalLight position={[4, 2, 5]} intensity={2.4} color="#fff2da" />
    <directionalLight position={[-5, -2, -3]} intensity={0.5} color="#5a9aff" />
    <Stars radius={65} depth={40} count={900} factor={3} fade speed={0} />
    <mesh onClick={(event) => { event.stopPropagation(); onPoint(coordinateFromPoint(event.point)) }}>
      <sphereGeometry args={[1, 96, 64]} />
      <meshStandardMaterial map={texture} color={texture ? '#ffffff' : '#a7a9ae'} roughness={1} metalness={0} />
    </mesh>
    {grid && <GlobeGrid />}
    <Marker coordinate={selected} color="#71edff" />
    {first && <Marker coordinate={first} color="#ffcb85" size={0.016} />}
    {second && <Marker coordinate={second} color="#ff8ea7" size={0.016} />}
    <CameraRig preset={preset} selected={selected} revision={revision} />
  </Canvas>
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Lunar renderer unavailable', error, info.componentStack) }
  render() {
    if (this.state.failed) return <div className="lunar-canvas-fallback"><span>3D VIEW UNAVAILABLE</span><p>Coordinate and source tools remain available. Check WebGL support to inspect the globe.</p></div>
    return this.props.children
  }
}

function formatCoordinate(coordinate: Coordinate): string {
  const latHemisphere = coordinate.lat < 0 ? 'S' : 'N'
  const lonHemisphere = coordinate.lon < 0 ? 'W' : 'E'
  return `${Math.abs(coordinate.lat).toFixed(3)}° ${latHemisphere} / ${Math.abs(coordinate.lon).toFixed(3)}° ${lonHemisphere}`
}

export default function LunarExplorer({ onBack, onCoordinateChange, image }: { onBack: () => void; onCoordinateChange?: (coordinates: string) => void; image: LunarImage }) {
  const [selected, setSelected] = useState<Coordinate>({ lat: -89, lon: 0 })
  useEffect(() => { onCoordinateChange?.(formatCoordinate(selected)) }, [selected, onCoordinateChange])
  const [latitude, setLatitude] = useState('-89')
  const [longitude, setLongitude] = useState('0')
  const [coordinateError, setCoordinateError] = useState('')
  const [grid, setGrid] = useState(false)
  const [preset, setPreset] = useState<Preset>('South pole')
  const [revision, setRevision] = useState(0)
  const [measureStep, setMeasureStep] = useState<MeasureStep>('off')
  const [first, setFirst] = useState<Coordinate | null>(null)
  const [second, setSecond] = useState<Coordinate | null>(null)
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)
  const [missionId, setMissionId] = useState(historicalMissions[0]?.id ?? '')
  const mission = historicalMissions.find((item) => item.id === missionId)

  function choosePoint(coordinate: Coordinate) {
    if (measureStep === 'first') {
      setFirst(coordinate)
      setSecond(null)
      setMeasureStep('second')
      return
    }
    if (measureStep === 'second') {
      setSecond(coordinate)
      setMeasureStep('off')
      return
    }
    setSelected(coordinate)
    setLatitude(coordinate.lat.toFixed(3))
    setLongitude(coordinate.lon.toFixed(3))
    setCoordinateError('')
  }

  function navigate() {
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (latitude.trim() === '' || longitude.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordinateError('Enter latitude −90° to 90° and east-positive longitude −180° to 180°.')
      return
    }
    setCoordinateError('')
    setSelected({ lat, lon })
    setPreset('Selected point')
    setRevision((value) => value + 1)
  }

  const measurement = first && second ? distanceKm(first, second) : null
  const presets: Preset[] = ['Near side', 'Far side', 'North pole', 'South pole']

  return <section className="lunar-explorer" aria-label="Lunar globe explorer">
    <div className="lunar-topbar">
      <button className="lunar-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Solar System</button>
      <div className="lunar-heading"><span className="lunar-eyebrow">LUNAR GEOSPATIAL WORKSTATION</span><h1>Explore the Moon</h1></div>
      <div className="lunar-top-state"><span className="lunar-status-dot" /> {image.state === 'available' ? 'LROC WAC CONTEXT IMAGE' : 'QUALITATIVE IMAGE'} <span className="lunar-state-separator">/</span> ELEVATION UNAVAILABLE</div>
    </div>

    <div className="lunar-layout">
      <aside className="lunar-panel lunar-tool-panel" aria-label="Lunar navigation and layers">
        <div className="lunar-panel-title"><Compass size={17} /><span>Navigation</span></div>
        <p className="lunar-muted">Orbit, zoom, or select a point on the globe.</p>
        <div className="lunar-preset-grid">{presets.map((name) => <button key={name} type="button" className={preset === name ? 'is-active' : ''} onClick={() => { setPreset(name); setRevision((value) => value + 1) }}>{name}</button>)}</div>

        <div className="lunar-panel-title lunar-section-title"><MapPinned size={17} /><span>Coordinate fly-to</span></div>
        <label className="lunar-input-label" htmlFor="lunar-lat">Latitude</label>
        <input id="lunar-lat" type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
        <label className="lunar-input-label" htmlFor="lunar-lon">Longitude · east positive</label>
        <input id="lunar-lon" type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') navigate() }} />
        {coordinateError && <p className="lunar-error" role="alert">{coordinateError}</p>}
        <button className="lunar-primary" type="button" onClick={navigate}><Crosshair size={15} /> Fly to coordinate</button>

        <div className="lunar-panel-title lunar-section-title"><Layers3 size={17} /><span>Data layers</span></div>
        <label className="lunar-grid-toggle"><input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} /> Coordinate grid</label>
        <div className="lunar-layer-list">{[{ name: 'Global LROC WAC mosaic', state: image.state === 'available' ? 'LOADED' : 'NOT IMPORTED', available: image.state === 'available', note: image.state === 'available' ? 'Requested LROC WAC 008P context image; 8 px/degree. This is imagery, not measured elevation.' : image.reason }, { name: 'Legacy lunar image', state: image.state === 'available' ? 'INACTIVE' : 'QUALITATIVE', available: image.state !== 'available', note: 'Bundled qualitative image. Registration and instrument metadata are not verified; do not use for measurements.' }, ...DATA_LAYERS].map((layer) => <div className="lunar-layer" key={layer.name}>
          <button type="button" aria-expanded={expandedLayer === layer.name} onClick={() => setExpandedLayer(expandedLayer === layer.name ? null : layer.name)}><span>{layer.name}</span><small className={layer.available ? 'is-illustrative' : ''}>{layer.state}</small></button>
          {expandedLayer === layer.name && <p>{layer.note}</p>}
        </div>)}</div>
      </aside>

      <div className="lunar-globe-panel">
        <div className="lunar-view-label"><span>VIEW / {preset.toUpperCase()}</span><span>SEL / {formatCoordinate(selected)}</span></div>
        <div className="lunar-canvas-wrap"><SceneBoundary><LunarScene key={image.url} selected={selected} first={first} second={second} grid={grid} preset={preset} revision={revision} onPoint={choosePoint} image={image} /></SceneBoundary></div>
        <div className="lunar-view-footer"><span>DRAG TO ORBIT · SCROLL TO ZOOM · CLICK TO SELECT</span><span>GLOBAL SURFACE: {image.state === 'available' ? 'LROC WAC CONTEXT' : 'QUALITATIVE IMAGE'}</span></div>
      </div>

      <aside className="lunar-panel lunar-inspect-panel" aria-label="Selected location and measurement">
        <div className="lunar-panel-title"><Crosshair size={17} /><span>Selected location</span></div>
        <div className="lunar-coordinate-display">{formatCoordinate(selected)}</div>
        <div className="lunar-fact"><span>Reference</span><strong>Mean-radius sphere</strong></div>
        <div className="lunar-fact"><span>Elevation</span><strong>NOT AVAILABLE</strong></div>
        <div className="lunar-fact"><span>Terrain safety</span><strong>NOT EVALUATED</strong></div>
        <p className="lunar-info-note">This marker identifies the selected coordinate on a mean-radius sphere. The displayed image is {image.state === 'available' ? 'LROC WAC context imagery' : 'a legacy qualitative lunar image'}; it is not an elevation or hazard map.</p>

        <div className="lunar-panel-title lunar-section-title"><Ruler size={17} /><span>Surface distance</span></div>
        <p className="lunar-muted">Select two points to calculate approximate great-circle distance on a sphere.</p>
        <button className="lunar-secondary" type="button" onClick={() => { setFirst(null); setSecond(null); setMeasureStep('first') }}><Ruler size={15} /> {measureStep === 'first' ? 'Click point A on the globe' : measureStep === 'second' ? 'Click point B on the globe' : 'Measure two points'}</button>
        {(first || second) && <button className="lunar-reset" type="button" onClick={() => { setFirst(null); setSecond(null); setMeasureStep('off') }}><RotateCcw size={13} /> Reset</button>}
        {first && <div className="lunar-fact"><span>Point A</span><strong>{formatCoordinate(first)}</strong></div>}
        {second && <div className="lunar-fact"><span>Point B</span><strong>{formatCoordinate(second)}</strong></div>}
        {measurement !== null && <div className="lunar-measure-result"><span>APPROX. SURFACE DISTANCE</span><strong>{measurement.toLocaleString(undefined, { maximumFractionDigits: 1 })} km</strong></div>}
        <p className="lunar-method">Method: spherical great circle, mean lunar radius 1,737.4 km. Terrain, elevation and route safety are excluded.</p>

        <div className="lunar-panel-title lunar-section-title"><Layers3 size={17} /><span>Source & convention</span></div>
        <p className="lunar-method">Coordinates are planetocentric latitude and east-positive longitude, displayed in −180° to 180°. Near side is centred on 0° longitude. Image texture alignment is for exploration and is not survey registration.</p>
        <div className="lunar-panel-title lunar-section-title"><MapPinned size={17} /><span>Mission intelligence</span></div>
        <p className="lunar-muted">Historical catalog snapshot. Select a mission to inspect its timeline, instruments and source.</p>
        <label className="lunar-input-label" htmlFor="lunar-mission">Mission</label>
        <select id="lunar-mission" className="lunar-mission-select" value={missionId} onChange={(event) => setMissionId(event.target.value)}>{historicalMissions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {mission && <div className="lunar-mission-detail"><h2>{mission.name}</h2><p>{mission.description}</p><div className="lunar-fact"><span>Status</span><strong>{mission.status}</strong></div><div className="lunar-fact"><span>Destination</span><strong>{mission.destination}</strong></div><p className="lunar-method">{mission.coordinateNote}</p><h3>Timeline</h3><ol>{mission.events.map((event) => <li key={`${event.date}-${event.title}`}><time dateTime={event.date}>{event.date}</time><strong>{event.title}</strong><span>{event.description}</span></li>)}</ol><h3>Named instruments</h3><ul>{mission.payloads.map((payload) => <li key={payload}>{payload}</li>)}</ul><p className="lunar-method">{mission.resultsNote}</p><a href={mission.source.url} target="_blank" rel="noopener noreferrer">{mission.source.name} · source ↗</a></div>}
      </aside>
    </div>
  </section>
}
