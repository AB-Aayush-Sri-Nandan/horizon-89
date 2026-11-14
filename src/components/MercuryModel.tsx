import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
export default function MercuryModel({
  radius,
  onStatus,
}: {
  radius: number;
  onStatus: (loaded: boolean, status: string) => void;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let active = true;
    let resource: THREE.Group | undefined;
    const controller = new AbortController();
    const dispose = (group: THREE.Group) => {
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) textures.add(value);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    };
    async function load() {
      try {
        const response = await fetch("/api/models/mercury", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("inventory unavailable");
        const inventory = await response.json();
        if (!inventory.available)
          throw new Error("upload absent or unsupported");
        const binary = await fetch(inventory.url, {
          signal: controller.signal,
        });
        if (!binary.ok) throw new Error("model unavailable");
        const gltf = await new GLTFLoader().parseAsync(
          await binary.arrayBuffer(),
          "",
        );
        resource = gltf.scene;
        if (!active) {
          dispose(resource);
          return;
        }
        const bounds = new THREE.Box3().setFromObject(resource);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const authoredRadius = Math.max(size.x, size.y, size.z) / 2;
        if (!Number.isFinite(authoredRadius) || authoredRadius <= 0)
          throw new Error("invalid geometry");
        // Retain authored orientation/materials; normalize only center and display radius.
        const wrapper = new THREE.Group();
        wrapper.add(resource);
        resource.position.sub(center);
        wrapper.scale.setScalar(radius / authoredRadius);
        setModel(wrapper);
        onStatus(
          true,
          "Local GLB model loaded · orientation/provenance unverified",
        );
        invalidate();
      } catch {
        if (active)
          onStatus(false, "Local GLB unavailable · untextured fallback");
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      if (resource) dispose(resource);
    };
  }, [radius, invalidate, onStatus]);
  return model ? <primitive object={model} /> : null;
}
