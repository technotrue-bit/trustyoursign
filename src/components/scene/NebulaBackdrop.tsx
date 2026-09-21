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
  RepeatWrapping,
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
const SKY_RADIUS = 95;
/** Second shell, UV spun so any residual seam is covered by the other map. */
const SKY_RADIUS_INNER = 92;

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
 * Camera-locked nebula sky — soft-edged composite on twin inward spheres plus
 * a static centre well. Soft plate falloff + wrap copies in the bake kill JPG
 * rectangles; dual shells fill left/right/above/behind so no black gutters or
 * picture frames remain. Pause freezes drift via `galaxyTravel.shaderTime`.
 */
export function NebulaBackdrop() {
  const group = useRef<Group>(null);
  const skyA = useRef<Mesh>(null);
  const skyB = useRef<Mesh>(null);
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
  const [compositeMapB, setCompositeMapB] = useState<CanvasTexture | null>(null);
  const segs = modest ? ([32, 24] as const) : ([48, 32] as const);

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
      setCompositeMapB(null);
      return;
    }
    const makeTex = () => {
      const tex = new CanvasTexture(baked);
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter;
      tex.magFilter = LinearFilter;
      tex.generateMipmaps = false;
      tex.anisotropy = modest ? 1 : 4;
      tex.needsUpdate = true;
      return tex;
    };
    const a = makeTex();
    const b = makeTex();
    // Spin the second shell's UVs half-turn so any residual meridian is covered.
    b.offset.set(0.5, 0.12);
    b.wrapS = RepeatWrapping;
    b.wrapT = RepeatWrapping;
    setCompositeMap(a);
    setCompositeMapB(b);
    return () => {
      a.dispose();
      b.dispose();
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
    const ready = Boolean(compositeMap);

    const a = skyA.current;
    if (a) {
      a.rotation.set(
        lookY * 0.05 + Math.sin(drift * 0.35) * 0.02,
        drift * 0.55 + lookX * 0.06,
        drift * 0.22,
      );
      const mat = a.material as MeshBasicMaterial;
      mat.opacity = ready ? 1 : 0;
      a.visible = ready;
    }

    const b = skyB.current;
    if (b) {
      b.rotation.set(
        -lookY * 0.03 + Math.cos(drift * 0.3) * 0.015,
        Math.PI + drift * -0.4 + lookX * -0.04,
        -drift * 0.18,
      );
      const mat = b.material as MeshBasicMaterial;
      mat.opacity = ready ? 0.72 : 0;
      b.visible = ready;
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
      <mesh ref={skyA} renderOrder={-24} frustumCulled={false} raycast={noopRaycast} visible={false}>
        <sphereGeometry args={[SKY_RADIUS, segs[0], segs[1]]} />
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
      <mesh ref={skyB} renderOrder={-23} frustumCulled={false} raycast={noopRaycast} visible={false}>
        <sphereGeometry args={[SKY_RADIUS_INNER, segs[0], segs[1]]} />
        <meshBasicMaterial
          map={compositeMapB}
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
