import { useEffect, useState } from 'react';
import * as THREE from 'three';

export type TextureStatus = 'LOADING' | 'AVAILABLE' | 'UNAVAILABLE';
export const MOON_TEXTURE = '/textures/moon-lro.png';

/** A failed/missing image must leave the reference sphere and controls usable. */
export function MoonModel({ onStatus }: { onStatus: (status: TextureStatus) => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    let loaded: THREE.Texture | null = null;
    onStatus('LOADING');
    new THREE.TextureLoader().load(MOON_TEXTURE, (image) => {
      loaded = image;
      if (!active) { image.dispose(); return; }
      // Source raster is north-up; Three's uploaded image flip maps top row to v=1.
      image.flipY = true;
      image.wrapS = THREE.RepeatWrapping;
      image.wrapT = THREE.ClampToEdgeWrapping;
      image.colorSpace = THREE.SRGBColorSpace;
      image.anisotropy = 4;
      setTexture(image);
      onStatus('AVAILABLE');
    }, undefined, () => { if (active) onStatus('UNAVAILABLE'); });
    return () => { active = false; loaded?.dispose(); };
  }, [onStatus]);
  return (
    <mesh>
      <sphereGeometry args={[1, 128, 128]} />
      {/* Morphology imagery is colour only; never use it as elevation/bump data. */}
      <meshStandardMaterial key={texture ? "lroc-texture" : "reference-sphere"} map={texture} color={texture ? '#ffffff' : '#93999f'} roughness={1} metalness={0} />
    </mesh>
  );
}
