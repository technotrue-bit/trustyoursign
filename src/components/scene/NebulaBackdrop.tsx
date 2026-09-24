import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
  Texture,
  UnsignedByteType,
  type MeshBasicMaterial,
} from "three";
import { isSmallGpu } from "@/lib/gpu";
import {
  NEBULA_COMPOSITE_DRIFT,
  NEBULA_GL_LAYER_GAIN,
  NEBULA_GL_LAYER_GAIN_MODEST,
  composeNebulaWallpaper,
  loadNebulaImages,
  loadPrebakedNebulaWallpaper,
  makeCenterWellData,
  nebulaCompositeSize,
  type NebulaImageMap,
} from "@/lib/galaxy/nebulaBackdrop";
import { exploringSign, galaxyTravel } from "@/lib/galaxy/travel";

function noopRaycast() {
  /* wallpaper never steals picks */
}

const MASK_SIZE = 256;
const WELL_DISTANCE = 40;
/**
 * One camera-locked plate behind the figure. Overscan keeps the bake's soft
 * rim outside the frustum so the frame never sees a rectangle edge.
 */
const BACK_DISTANCE = 70;
/**
 * Just enough to park the bake's rim fade (last 10% of the square) plus the
 * drift and look-parallax outside the frustum. Every extra tenth here is
 * magnification, i.e. texels thrown away, so it stays tight.
 */
const BACK_OVERSCAN = 1.26;

function makeDataTexture(data: Uint8ClampedArray, srgb: boolean) {
  const tex = new DataTexture(data, MASK_SIZE, MASK_SIZE, RGBAFormat, UnsignedByteType);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function configureWallpaperTexture(tex: Texture, modest: boolean, maxAnisotropy: number) {
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = modest ? 1 : Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Camera-locked nebula sky. A single full-bleed plate stays opaque through
 * the middle. Split left/right wings (offset by ±0.95 of the view width and
 * yawed inward) left a dark vertical gap behind the figure; one cover-fit
 * plate cannot. Soft plate falloff lives in the bake. A radial centre well
 * darkens type. Pause freezes drift via `galaxyTravel.shaderTime`.
 */
type NebulaBackdropProps = {
  /** Fires once the wallpaper texture is on the GPU (next frame after upload). */
  onBackdropReady?: () => void;
};

export function NebulaBackdrop({ onBackdropReady }: NebulaBackdropProps = {}) {
  const group = useRef<Group>(null);
  const back = useRef<Mesh>(null);
  const well = useRef<Mesh>(null);
  const { camera, gl } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
  const modest = typeof window !== "undefined" && isSmallGpu();
  const gain = modest ? NEBULA_GL_LAYER_GAIN_MODEST : NEBULA_GL_LAYER_GAIN;
  const [compositeMap, setCompositeMap] = useState<Texture | null>(null);

  useEffect(() => {
    let disposed = false;
    let owned: Texture | null = null;

    void (async () => {
      const prebaked = await loadPrebakedNebulaWallpaper(modest, "gl");
      if (disposed) return;
      if (prebaked) {
        const tex = new Texture(prebaked);
        owned = tex;
        configureWallpaperTexture(tex, modest, maxAnisotropy);
        setCompositeMap(tex);
        return;
      }
      const images: NebulaImageMap = await loadNebulaImages(modest);
      if (disposed) return;
      const baked = composeNebulaWallpaper(images, nebulaCompositeSize(modest), gain);
      if (!baked) {
        setCompositeMap(null);
        return;
      }
      const tex = new CanvasTexture(baked);
      owned = tex;
      configureWallpaperTexture(tex, modest, maxAnisotropy);
      setCompositeMap(tex);
    })();

    return () => {
      disposed = true;
      owned?.dispose();
    };
  }, [modest, gain, maxAnisotropy]);

  useEffect(() => {
    if (!compositeMap || !onBackdropReady) return;
    const id = requestAnimationFrame(() => onBackdropReady());
    return () => cancelAnimationFrame(id);
  }, [compositeMap, onBackdropReady]);

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
    const visH = 2 * BACK_DISTANCE * Math.tan(fovRad / 2);
    const visW = visH * aspect;
    // Square cover so a wide desktop does not stretch the bake into two cards.
    const cover = Math.max(visW, visH) * BACK_OVERSCAN;

    const plate = back.current;
    if (plate) {
      plate.scale.set(cover, cover, 1);
      plate.position.set(
        Math.sin(drift) * visW * 0.018 + lookX * visW * 0.03,
        Math.cos(drift * 0.9) * visH * 0.014 + lookY * visH * 0.025,
        -BACK_DISTANCE,
      );
      plate.rotation.z = Math.sin(drift) * 0.04;
      const mat = plate.material as MeshBasicMaterial;
      mat.opacity = ready ? 1 : 0;
      plate.visible = ready;
    }

    const w = well.current;
    if (w) {
      const wellH = 2 * WELL_DISTANCE * Math.tan(fovRad / 2);
      const wellW = wellH * aspect;
      const portrait = aspect < 1;
      w.scale.set(wellW, wellH * (portrait ? 1.12 : 1), 1);
      w.position.set(0, wellH * 0.06, -WELL_DISTANCE);
      w.visible = true;
    }
  });

  return (
    <group ref={group} renderOrder={-24}>
      <mesh
        ref={back}
        renderOrder={-24}
        frustumCulled={false}
        raycast={noopRaycast}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
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
