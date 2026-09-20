import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  DataTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  RGBAFormat,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  type MeshBasicMaterial,
} from "three";
import { isSmallGpu } from "@/lib/gpu";
import {
  NEBULA_GL_LAYER_GAIN,
  NEBULA_GL_LAYER_GAIN_MODEST,
  NEBULA_LAYERS,
  NEBULA_TINT,
  makeCenterWellData,
  makeEdgeAlphaMaskData,
  nebulaUrl,
} from "@/lib/galaxy/nebulaBackdrop";
import { exploringSign, galaxyTravel } from "@/lib/galaxy/travel";

function noopRaycast() {
  /* wallpaper never steals picks */
}

const MASK_SIZE = 256;
const WELL_DISTANCE = 40;

function makeDataTexture(data: Uint8ClampedArray, srgb: boolean) {
  const tex = new DataTexture(data, MASK_SIZE, MASK_SIZE, RGBAFormat, UnsignedByteType);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Camera-locked distant nebula planes — fills the `#0c0b0a` clear behind the
 * HTML Gemini card. Normal-blended with an edge alpha mask so the five layers
 * never stack to white mid-frame; a static centre well sits in front of them
 * so the figure and parchment type read as ink on dark. Pause freezes drift via
 * `galaxyTravel.shaderTime`.
 */
export function NebulaBackdrop() {
  const group = useRef<Group>(null);
  const well = useRef<Mesh>(null);
  const { camera } = useThree();
  const modest = typeof window !== "undefined" && isSmallGpu();
  const gain = modest ? NEBULA_GL_LAYER_GAIN_MODEST : NEBULA_GL_LAYER_GAIN;
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
  const edgeMask = useMemo(
    () => makeDataTexture(makeEdgeAlphaMaskData(MASK_SIZE), false),
    [],
  );
  const wellMap = useMemo(
    () => makeDataTexture(makeCenterWellData(MASK_SIZE), true),
    [],
  );
  useEffect(
    () => () => {
      edgeMask.dispose();
      wellMap.dispose();
    },
    [edgeMask, wellMap],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const t = galaxyTravel.shaderTime;
    const lookX = exploringSign() ? galaxyTravel.exploreLookX : 0;
    const lookY = exploringSign() ? galaxyTravel.exploreLookY : 0;
    for (let i = 0; i < NEBULA_LAYERS.length; i++) {
      const child = g.children[i];
      const spec = NEBULA_LAYERS[i];
      if (!child || !spec) continue;
      const drift = t * spec.drift;
      child.rotation.z = drift * 0.4;
      child.position.set(
        spec.ox * 14 + Math.sin(drift) * 1.4 + lookX * 2.2,
        -spec.oy * 10 + Math.cos(drift * 0.9) * 1.1 + lookY * 1.6,
        -42 - i * 5,
      );
      const mat = (child as { material?: MeshBasicMaterial }).material;
      if (mat && "opacity" in mat) {
        mat.opacity = spec.opacity * gain;
      }
    }
    // Static well: sized to the visible frustum at its depth so the ellipse
    // always covers the figure + text column and leaves the corners alive.
    const w = well.current;
    if (w) {
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
      const aspect = camera instanceof PerspectiveCamera ? camera.aspect : 1;
      const visH = 2 * WELL_DISTANCE * Math.tan((fov * Math.PI) / 360);
      const visW = visH * aspect;
      const portrait = aspect < 1;
      w.scale.set(visW, visH * (portrait ? 1.12 : 1), 1);
      w.position.set(0, visH * 0.06, -WELL_DISTANCE);
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
            alphaMap={edgeMask}
            color={NEBULA_TINT}
            transparent
            opacity={spec.opacity * gain}
            premultipliedAlpha={false}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            fog={false}
            side={DoubleSide}
            blending={NormalBlending}
          />
        </mesh>
      ))}
      <mesh ref={well} renderOrder={-12} frustumCulled={false} raycast={noopRaycast}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={wellMap}
          transparent
          premultipliedAlpha={false}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          fog={false}
          side={DoubleSide}
          blending={NormalBlending}
        />
      </mesh>
    </group>
  );
}
