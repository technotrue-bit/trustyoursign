import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import {
  Box3,
  BufferAttribute,
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import type { SignId } from "@/lib/chart/types";
import { SIGN_ART } from "@/lib/galaxy/signArt";
import { buildShellGeometry, getSignVolume } from "@/lib/galaxy/signVolume";

const GOLD = new Color("#c9a45c");
const OBSIDIAN = new Color("#0a0908");

type Props = {
  signId: SignId;
  /** World height of the tallest axis after fit (mesh review). */
  fitHeight?: number;
  /** When set (Vault), scale like the plate: width = PLATE_WIDE. */
  plateWide?: number;
};

export function SignShell({ signId, fitHeight = 3.4, plateWide }: Props) {
  const meshRef = useRef<Mesh>(null);
  const albedo = useLoader(TextureLoader, SIGN_ART[signId]);
  const geo = useMemo(() => buildShellGeometry(signId), [signId]);

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

  const aspect = getSignVolume(signId)?.aspect ?? 16 / 9;

  const scale = useMemo((): [number, number, number] => {
    if (plateWide) return [plateWide, plateWide / aspect, plateWide];
    if (!geo) return [1, 1, 1];
    const box = new Box3().setFromBufferAttribute(
      geo.getAttribute("position") as BufferAttribute,
    );
    const size = new Vector3();
    box.getSize(size);
    const tall = Math.max(size.x, size.y, size.z, 0.001);
    const s = fitHeight / tall;
    return [s, s, s];
  }, [geo, fitHeight, plateWide, aspect]);

  useLayoutEffect(() => {
    if (!meshRef.current || !geo) return;
    const box = new Box3().setFromBufferAttribute(
      geo.getAttribute("position") as BufferAttribute,
    );
    const center = new Vector3();
    box.getCenter(center);
    meshRef.current.position.set(-center.x, -center.y, -center.z);
  }, [geo, signId]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    return () => {
      geo?.dispose();
    };
  }, [geo]);

  if (!geo) return null;

  return (
    <group scale={scale}>
      <mesh
        ref={meshRef}
        geometry={geo}
        material={material}
        frustumCulled={false}
      />
    </group>
  );
}
