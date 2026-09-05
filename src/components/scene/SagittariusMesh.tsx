import { useEffect, useMemo, useLayoutEffect, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

/** Byte-copied from technotrue-bit/Sagittarius-3D — do not invent geometry. */
export const SAGITTARIUS_OBJ_URL = "/models/sagittarius/SagittariusMesh.obj";
export const SAGITTARIUS_ALBEDO_URL = "/models/sagittarius/thin-gold-front.png";

const GOLD = new Color("#c9a45c");
const OBSIDIAN = new Color("#0a0908");

type Props = {
  /** Target world height of the tallest axis after fit. */
  fitHeight?: number;
  /** Soft auto-spin so volume reads without dragging. */
  autoSpin?: boolean;
};

/**
 * Sagittarius extruded silhouette with a thin-gold / obsidian read.
 * Source of truth: Sagittarius-3D OBJ + Art/Sagittarius front plate as albedo.
 */
export function SagittariusMesh({ fitHeight = 3.4, autoSpin = false }: Props) {
  const root = useRef<Group>(null);
  const obj = useLoader(OBJLoader, SAGITTARIUS_OBJ_URL);
  const albedo = useLoader(TextureLoader, SAGITTARIUS_ALBEDO_URL);

  const material = useMemo(() => {
    albedo.colorSpace = SRGBColorSpace;
    albedo.anisotropy = 8;
    albedo.needsUpdate = true;
    return new MeshPhysicalMaterial({
      map: albedo,
      color: new Color("#f2e6d2"),
      metalness: 0.72,
      roughness: 0.22,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      reflectivity: 0.85,
      emissive: GOLD.clone().multiplyScalar(0.35),
      emissiveMap: albedo,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.94,
      side: DoubleSide,
      envMapIntensity: 1.15,
      attenuationColor: OBSIDIAN,
    });
  }, [albedo]);

  const clone = useMemo(() => {
    const g = obj.clone(true);
    g.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = material;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
      }
    });
    return g;
  }, [obj, material]);

  useLayoutEffect(() => {
    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const tall = Math.max(size.y, 0.001);
    const s = fitHeight / tall;
    clone.position.set(-center.x * s, -center.y * s, -center.z * s);
    clone.scale.setScalar(s);
  }, [clone, fitHeight]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    if (!autoSpin || !root.current) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (root.current) root.current.rotation.y += dt * 0.35;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoSpin]);

  return (
    <group ref={root}>
      <primitive object={clone} />
    </group>
  );
}

useLoader.preload(OBJLoader, SAGITTARIUS_OBJ_URL);
useLoader.preload(TextureLoader, SAGITTARIUS_ALBEDO_URL);
