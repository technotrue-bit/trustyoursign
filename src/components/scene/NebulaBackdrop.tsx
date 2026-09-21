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
/** Far back plate — oversized past the frustum so soft rims stay off-screen. */
const BACK_DISTANCE = 78;
const WING_DISTANCE = 64;
/** How much larger than the visible frustum each plate is. */
const BACK_OVERSCAN = 2.85;
const WING_OVERSCAN = 2.35;

function makeDataTexture(data: Uint8ClampedArray, srgb: boolean) {
  const tex = new DataTexture(data, MASK_SIZE, MASK_SIZE, RGBAFormat, UnsignedByteType);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

type ShellRefs = {
  back: Mesh | null;
  left: Mesh | null;
  right: Mesh | null;
  up: Mesh | null;
};

/**
 * Camera-locked nebula sky — soft-edged composite on a far overscanned back
 * plate plus left/right/up wings so the sky fills the frustum with no black
 * gutter and no mid-ground billboard. Soft plate falloff in the bake kills JPG
 * rectangles. Pause freezes drift via `galaxyTravel.shaderTime`.
 */
export function NebulaBackdrop() {
  const group = useRef<Group>(null);
  const shells = useRef<ShellRefs>({ back: null, left: null, right: null, up: null });
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
    const ready = Boolean(compositeMap);

    const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
    const aspect = camera instanceof PerspectiveCamera ? camera.aspect : 1;
    const fovRad = (fov * Math.PI) / 180;
    const backH = 2 * BACK_DISTANCE * Math.tan(fovRad / 2);
    const backW = backH * aspect;
    const wingH = 2 * WING_DISTANCE * Math.tan(fovRad / 2);
    const wingW = wingH * aspect;

    const { back, left, right, up } = shells.current;
    if (back) {
      back.scale.set(backW * BACK_OVERSCAN, backH * BACK_OVERSCAN, 1);
      back.position.set(
        Math.sin(drift) * backW * 0.04 + lookX * backW * 0.06,
        Math.cos(drift * 0.9) * backH * 0.03 + lookY * backH * 0.05,
        -BACK_DISTANCE,
      );
      back.rotation.z = drift * 0.12;
      const mat = back.material as MeshBasicMaterial;
      mat.opacity = ready ? 1 : 0;
      back.visible = ready;
    }
    if (left) {
      left.scale.set(wingW * WING_OVERSCAN, wingH * WING_OVERSCAN, 1);
      left.position.set(-wingW * 0.95, lookY * wingH * 0.04, -WING_DISTANCE * 0.72);
      left.rotation.set(0, 0.95, drift * 0.08);
      const mat = left.material as MeshBasicMaterial;
      mat.opacity = ready ? 0.9 : 0;
      left.visible = ready;
    }
    if (right) {
      right.scale.set(wingW * WING_OVERSCAN, wingH * WING_OVERSCAN, 1);
      right.position.set(wingW * 0.95, lookY * wingH * 0.04, -WING_DISTANCE * 0.72);
      right.rotation.set(0, -0.95, -drift * 0.08);
      const mat = right.material as MeshBasicMaterial;
      mat.opacity = ready ? 0.9 : 0;
      right.visible = ready;
    }
    if (up) {
      up.scale.set(backW * 2.2, backH * 1.6, 1);
      up.position.set(0, backH * 0.7, -BACK_DISTANCE * 0.85);
      up.rotation.set(-0.75, 0, drift * 0.05);
      const mat = up.material as MeshBasicMaterial;
      mat.opacity = ready ? 0.75 : 0;
      up.visible = ready;
    }

    const w = well.current;
    if (w) {
      const visH = 2 * WELL_DISTANCE * Math.tan(fovRad / 2);
      const visW = visH * aspect;
      const portrait = aspect < 1;
      w.scale.set(visW, visH * (portrait ? 1.12 : 1), 1);
      w.position.set(0, visH * 0.06, -WELL_DISTANCE);
      w.visible = true;
    }
  });

  const skyMat = (map: CanvasTexture | null) => (
    <meshBasicMaterial
      map={map}
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
  );

  return (
    <group ref={group} renderOrder={-24}>
      <mesh
        ref={(m) => {
          shells.current.back = m;
        }}
        renderOrder={-24}
        frustumCulled={false}
        raycast={noopRaycast}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        {skyMat(compositeMap)}
      </mesh>
      <mesh
        ref={(m) => {
          shells.current.left = m;
        }}
        renderOrder={-23}
        frustumCulled={false}
        raycast={noopRaycast}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        {skyMat(compositeMap)}
      </mesh>
      <mesh
        ref={(m) => {
          shells.current.right = m;
        }}
        renderOrder={-23}
        frustumCulled={false}
        raycast={noopRaycast}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        {skyMat(compositeMap)}
      </mesh>
      <mesh
        ref={(m) => {
          shells.current.up = m;
        }}
        renderOrder={-22}
        frustumCulled={false}
        raycast={noopRaycast}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        {skyMat(compositeMap)}
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
