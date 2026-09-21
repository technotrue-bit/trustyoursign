import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
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
  NEBULA_COMPOSITE_DRIFT,
  NEBULA_GL_LAYER_GAIN,
  NEBULA_GL_LAYER_GAIN_MODEST,
  NEBULA_LAYERS,
  composeNebulaWallpaper,
  makeCenterWellData,
  nebulaCompositeSize,
  nebulaUrl,
  type NebulaImageMap,
} from "@/lib/galaxy/nebulaBackdrop";
import { exploringSign, galaxyTravel } from "@/lib/galaxy/travel";

function noopRaycast() {
  /* wallpaper never steals picks */
}

const MASK_SIZE = 256;
const WELL_DISTANCE = 40;
const PLANE_DISTANCE = 48;

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
 * Camera-locked nebula wallpaper — one baked composite plane + a static centre
 * well. Replaces five live additive/normal planes so mid-frame fill cost drops
 * from six draws to two. Pause freezes drift via `galaxyTravel.shaderTime`.
 */
export function NebulaBackdrop() {
  const group = useRef<Group>(null);
  const plane = useRef<Mesh>(null);
  const well = useRef<Mesh>(null);
  const { camera } = useThree();
  const modest = typeof window !== "undefined" && isSmallGpu();
  const gain = modest ? NEBULA_GL_LAYER_GAIN_MODEST : NEBULA_GL_LAYER_GAIN;
  const urls = useMemo(
    () => NEBULA_LAYERS.map((l) => nebulaUrl(l.id, modest)),
    [modest],
  );
  const textures = useLoader(TextureLoader, urls);
  const [compositeMap, setCompositeMap] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    const list = Array.isArray(textures) ? textures : [textures];
    const images: NebulaImageMap = new Map();
    for (let i = 0; i < NEBULA_LAYERS.length; i++) {
      const layer = NEBULA_LAYERS[i]!;
      const img = list[i]?.image as CanvasImageSource | undefined;
      if (img) images.set(layer.id, img as HTMLImageElement);
    }
    const baked = composeNebulaWallpaper(images, nebulaCompositeSize(modest), gain);
    if (!baked) {
      setCompositeMap(null);
      return;
    }
    const tex = new CanvasTexture(baked);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    tex.anisotropy = modest ? 1 : 4;
    tex.needsUpdate = true;
    setCompositeMap(tex);
    return () => {
      tex.dispose();
    };
  }, [textures, modest, gain]);

  const wellMap = useMemo(
    () => makeDataTexture(makeCenterWellData(MASK_SIZE), true),
    [],
  );
  useEffect(
    () => () => {
      wellMap.dispose();
    },
    [wellMap],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const t = galaxyTravel.shaderTime;
    const lookX = exploringSign() ? galaxyTravel.exploreLookX : 0;
    const lookY = exploringSign() ? galaxyTravel.exploreLookY : 0;
    const drift = t * NEBULA_COMPOSITE_DRIFT;

    const p = plane.current;
    if (p) {
      p.rotation.z = drift * 0.4;
      p.position.set(
        Math.sin(drift) * 1.4 + lookX * 2.2,
        Math.cos(drift * 0.9) * 1.1 + lookY * 1.6,
        -PLANE_DISTANCE,
      );
      const mat = p.material as MeshBasicMaterial;
      const ready = Boolean(compositeMap);
      mat.opacity = ready ? 1 : 0;
      p.visible = ready;
    }

    const w = well.current;
    if (w) {
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
      const aspect = camera instanceof PerspectiveCamera ? camera.aspect : 1;
      const visH = 2 * WELL_DISTANCE * Math.tan((fov * Math.PI) / 360);
      const visW = visH * aspect;
      const portrait = aspect < 1;
      w.scale.set(visW, visH * (portrait ? 1.12 : 1), 1);
      w.position.set(0, visH * 0.06, -WELL_DISTANCE);
      w.visible = true;
    }
  });

  return (
    <group ref={group} renderOrder={-24}>
      <mesh ref={plane} renderOrder={-24} frustumCulled={false} raycast={noopRaycast} visible={false}>
        <planeGeometry args={[64, 64]} />
        <meshBasicMaterial
          map={compositeMap}
          transparent
          opacity={0}
          premultipliedAlpha={false}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          fog={false}
          side={DoubleSide}
          blending={NormalBlending}
        />
      </mesh>
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
