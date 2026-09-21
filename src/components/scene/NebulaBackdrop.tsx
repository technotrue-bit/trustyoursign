import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  BackSide,
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
/** Far sky shell — wraps the camera so no mid-ground billboard remains. */
const SKY_RADIUS = 110;

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
 * Camera-locked nebula sky — one soft-edged composite on an inward sphere plus
 * a static centre well. Soft plate falloff in the bake kills JPG rectangles;
 * the sphere fills left/right/above/behind so no black gutters or picture
 * frames remain. Pause freezes drift via `galaxyTravel.shaderTime`.
 */
export function NebulaBackdrop() {
  const group = useRef<Group>(null);
  const sky = useRef<Mesh>(null);
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
  const sphereArgs = useMemo(
    () => [SKY_RADIUS, modest ? 32 : 48, modest ? 24 : 32] as [number, number, number],
    [modest],
  );

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

    const s = sky.current;
    if (s) {
      // Slow whole-sky drift + tiny look parallax — sphere stays around the camera.
      s.rotation.set(
        lookY * 0.05 + Math.sin(drift * 0.35) * 0.02,
        drift * 0.55 + lookX * 0.06,
        drift * 0.22,
      );
      const mat = s.material as MeshBasicMaterial;
      const ready = Boolean(compositeMap);
      mat.opacity = ready ? 1 : 0;
      s.visible = ready;
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
      <mesh ref={sky} renderOrder={-24} frustumCulled={false} raycast={noopRaycast} visible={false}>
        <sphereGeometry args={sphereArgs} />
        <meshBasicMaterial
          map={compositeMap}
          transparent
          opacity={0}
          premultipliedAlpha={false}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          fog={false}
          side={BackSide}
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
