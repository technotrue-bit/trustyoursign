import { useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  DoubleSide,
  Group,
  SRGBColorSpace,
  TextureLoader,
  type MeshBasicMaterial,
} from "three";
import { isSmallGpu } from "@/lib/gpu";
import { NEBULA_LAYERS, nebulaUrl } from "@/lib/galaxy/nebulaBackdrop";
import { exploringSign, galaxyTravel } from "@/lib/galaxy/travel";

function noopRaycast() {
  /* wallpaper never steals picks */
}

/**
 * Camera-locked distant nebula planes — fills the `#000000` clear behind the
 * HTML Gemini card. Pause freezes drift via `galaxyTravel.shaderTime`.
 */
export function NebulaBackdrop() {
  const group = useRef<Group>(null);
  const { camera } = useThree();
  const modest = typeof window !== "undefined" && isSmallGpu();
  const urls = useMemo(
    () => NEBULA_LAYERS.map((l) => nebulaUrl(l.id, modest)),
    [modest],
  );
  const textures = useLoader(TextureLoader, urls);
  const texList = useMemo(() => {
    const list = Array.isArray(textures) ? textures : [textures];
    for (const tex of list) {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = modest ? 1 : 4;
    }
    return list;
  }, [textures, modest]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const t = galaxyTravel.shaderTime;
    const lookX = exploringSign() ? galaxyTravel.exploreLookX : 0;
    const lookY = exploringSign() ? galaxyTravel.exploreLookY : 0;
    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i]!;
      const spec = NEBULA_LAYERS[i];
      if (!spec) continue;
      const drift = t * spec.drift;
      child.rotation.z = drift * 0.4;
      child.position.set(
        spec.ox * 14 + Math.sin(drift) * 1.4 + lookX * 2.2,
        -spec.oy * 10 + Math.cos(drift * 0.9) * 1.1 + lookY * 1.6,
        -42 - i * 5,
      );
      const mat = (child as { material?: MeshBasicMaterial }).material;
      if (mat && "opacity" in mat) {
        mat.opacity = spec.opacity * (modest ? 0.68 : 0.8);
      }
    }
  });

  return (
    <group ref={group} renderOrder={-24}>
      {NEBULA_LAYERS.map((spec, i) => (
        <mesh
          key={spec.id}
          renderOrder={-24 - i}
          frustumCulled={false}
          raycast={noopRaycast}
        >
          <planeGeometry args={[64, 64]} />
          <meshBasicMaterial
            map={texList[i]}
            transparent
            opacity={spec.opacity * (modest ? 0.68 : 0.8)}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            fog={false}
            side={DoubleSide}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
