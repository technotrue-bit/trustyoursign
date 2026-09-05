import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  FogExp2,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  Points,
  SRGBColorSpace,
  Vector3,
} from "three";
import { isSmallGpu } from "@/lib/gpu";
import { CONSTELLATIONS, ELEMENT_TINT, pairFigures } from "@/lib/galaxy/constellations";
import {
  HOLD_FLY,
  aimedIndex,
  ensureAutoClock,
  ensureFlyInput,
  galaxyTravel,
  noteControl,
  prefersReducedMotion,
  publishTravel,
  skipBirth,
  stepBirth,
  stepSeek,
  stepZoom,
} from "@/lib/galaxy/travel";
import {
  bootIntro,
  introCam,
  introCanSkip,
  introField,
  introPlaying,
  introAries,
  skipIntro,
  stepIntro,
  uAssemble,
  uBirth,
} from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import { fillMorphCloud, makeSparkMaterial } from "@/lib/galaxy/starRender";
import {
  computeBirthChatSlide,
  lerpToward,
  computePlateOpacity,
} from "@/lib/galaxy/birthchat-slide";
import { createDiskSim, disposeDisk, stepDisk } from "@/lib/galaxy/disk";
import {
  loadSignArt,
  preloadSignArt,
  preloadSignArtRest,
  hydrateSignArt,
  artReady,
  artAspect,
  primeSignArt,
  plateReady,
} from "@/lib/galaxy/signArt";
import {
  denseCloud,
  getSignVolume,
  hasVolumeSign,
  interiorCloud,
  primeSignVolumes,
  volumeChest,
} from "@/lib/galaxy/signVolume";
import { buildBirthNebula, makeNebulaMaterial } from "@/lib/galaxy/nebula";
import { makeStarSprite } from "@/lib/galaxy/celestial";
import {
  NAVE,
  PLATE_WIDE,
  TEMPLE_CURVE,
  TEMPLE_SIGNS,
  TEMPLE_STATIONS,
  clamp01,
  heroFrame,
  viewAspect,
  lerpAccent,
  lerpFog,
  stationFromT,
  stationT,
  type TempleSign,
} from "@/lib/galaxy/temple";
import { useShelfSession } from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { CelestialSky } from "./CelestialSky";
import { CornerGalaxies } from "./CornerGalaxies";
import { SignShell } from "./SignShell";

const SMALL = typeof window !== "undefined" && isSmallGpu();
const DUST_N = SMALL ? 180 : 320;
const CLOUD_N = SMALL ? 2600 : 4400;

const _cam = new Vector3();
const _look = new Vector3();
const _chest = new Vector3();
const _fog = new Color();
const _accent = new Color();
const _up = new Vector3(0, 1, 0);
const _sitCam = new Vector3();
const _camRight = new Vector3();
const _camUp = new Vector3();

function cssViewWidth() {
  if (typeof window === "undefined") return 1280;
  return window.visualViewport?.width ?? window.innerWidth;
}

function noopRaycast() {
  /* never steal sign picks */
}

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function makeScatter(index: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = index * 1.73 + i * 2.399;
    const r = 9 + (i % 5) * 1.8;
    return new Vector3(Math.cos(a) * r, Math.sin(a * 0.7) * 5.2, Math.sin(a) * r * 0.5);
  });
}

function finishTexture(tex: CanvasTexture) {
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.premultiplyAlpha = true;
  tex.needsUpdate = true;
  return tex;
}

function makeCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255, 248, 236, 0.95)");
  g.addColorStop(0.12, "rgba(255, 236, 214, 0.55)");
  g.addColorStop(0.32, "rgba(232, 214, 188, 0.16)");
  g.addColorStop(0.62, "rgba(160, 140, 110, 0.04)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return finishTexture(new CanvasTexture(canvas));
}

export function GalaxyIntro() {
  const { gl, scene } = useThree();
  const [sky, setSky] = useState(false);
  const [rest, setRest] = useState(false);
  useEffect(() => {
    bootIntro();
    galaxyTravel.birth = 1;
    preloadSignArt();
    primeSignArt("aries");
    primeSignArt("taurus");
    const skyT = window.setTimeout(() => setSky(true), 80);
    const restT = window.setTimeout(
      () => {
        setRest(true);
        preloadSignArtRest();
        primeSignVolumes();
        for (const c of CONSTELLATIONS) primeSignArt(c.id);
      },
      SMALL ? 700 : 480,
    );
    return () => {
      window.clearTimeout(skyT);
      window.clearTimeout(restT);
    };
  }, []);
  useEffect(() => {
    const prev = gl.toneMapping;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = SRGBColorSpace;
    scene.fog = new FogExp2("#100e0c", 0.01);
    return () => {
      gl.toneMapping = prev || NoToneMapping;
    };
  }, [gl, scene]);
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.08} color="#c8b8a0" />
      <hemisphereLight args={["#1a1820", "#080706", 0.18]} />
      <StationLight />
      {sky ? <CelestialSky /> : null}
      {sky ? <CornerGalaxies /> : null}
      {sky ? <Dust /> : null}
      <BirthNebula />
      {TEMPLE_SIGNS.map((sign, i) => (
        <Station key={sign.id} index={i} sign={sign} eager={i <= 2} />
      ))}
      {sky ? <SignDisk /> : null}
      <ChartRing />
      <TempleRig />
    </>
  );
}

function StationLight() {
  const light = useRef<import("three").PointLight>(null);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const t = galaxyTravel.t;
    TEMPLE_CURVE.getPointAt(clamp01(t + 0.012), _chest);
    l.position.copy(_chest);
    l.position.y += 2.2;
    lerpAccent(t, _accent);
    l.color.copy(_accent);
  });
  return <pointLight ref={light} intensity={2.4} distance={48} decay={2} color="#e8c49a" />;
}

function SignDisk() {
  const group = useRef<Group>(null);
  const slideX = useRef(0);
  const slideY = useRef(0);
  const scaleBoost = useRef(1);
  const sim = useMemo(() => createDiskSim(), []);
  useEffect(() => () => disposeDisk(sim), [sim]);
  useFrame(({ clock, gl, camera }, dt) => {
    const g = group.current;
    if (!g) return;
    const idx = aimedIndex();
    const sign = TEMPLE_SIGNS[idx];
    if (!sign) {
      g.visible = false;
      return;
    }
    const sit = TEMPLE_STATIONS[idx]!;
    const chest = volumeChest(sign.id);
    const aspect = getSignVolume(sign.id)?.aspect ?? 16 / 9;
    const dist = Math.abs(galaxyTravel.t - stationT(idx));
    const gather = 1 - Math.min(1, dist / 0.07);
    const intro = introPlaying() ? introAries() : 1;
    const veil = useGalaxy.getState().introVeil;
    const state = useSessionStore.getState();
    const chatting = state.claim !== null && state.session === null;
    const picked = chatting && state.claim?.signId === sign.id;
    const show = gather > 0.32 && intro > 0.4 && veil < 0.45;
    g.visible = show;
    if (!show) {
      sim.mat.uniforms.uFade.value = 0;
      return;
    }
    const cam = camera as PerspectiveCamera;
    _sitCam.copy(sit);
    cam.worldToLocal(_sitCam);
    const slide = computeBirthChatSlide({
      picked,
      travelT: galaxyTravel.t,
      stationT: stationT(idx),
      fov: cam.fov,
      sitCameraZ: _sitCam.z,
      aspect: cam.aspect,
      cssWidth: cssViewWidth(),
      plateWide: PLATE_WIDE,
      plateAspect: aspect,
      currentScale: scaleBoost.current,
    });
    slideX.current = lerpToward({ current: slideX.current, target: slide.offsetX, dt, rate: 2.2 });
    slideY.current = lerpToward({ current: slideY.current, target: slide.offsetY, dt, rate: 2.2 });
    scaleBoost.current = lerpToward({
      current: scaleBoost.current,
      target: slide.targetScale,
      dt,
      rate: 2.2,
    });
    g.position.set(
      sit.x + chest.x * PLATE_WIDE * 0.55,
      sit.y + chest.y * (PLATE_WIDE / aspect) * 0.45,
      sit.z + 0.22,
    );
    _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    g.position.addScaledVector(_camRight, slideX.current);
    g.position.addScaledVector(_camUp, slideY.current);
    g.scale.setScalar(3.2);
    stepDisk(
      sim,
      dt,
      sign.id,
      null,
      galaxyTravel.ptrX,
      galaxyTravel.ptrY,
      galaxyTravel.ptrOn && !galaxyTravel.dragging,
      prefersReducedMotion(),
    );
    sim.mat.uniforms.uTime.value = clock.elapsedTime;
    sim.mat.uniforms.uFade.value =
      Math.min(1, (gather - 0.32) / 0.4) * Math.min(1, (intro - 0.38) / 0.4) * (1 - veil);
    sim.mat.uniforms.uPixelRatio.value = Math.min(2, gl.getPixelRatio());
  });
  return (
    <group ref={group} visible={false} frustumCulled={false}>
      <points
        geometry={sim.geo}
        material={sim.mat}
        frustumCulled={false}
        renderOrder={16}
        raycast={noopRaycast}
      />
    </group>
  );
}

function Dust() {
  const points = useRef<Points>(null);
  const tex = useMemo(() => makeCircleTexture(), []);
  const geo = useMemo(() => {
    const geometry = new BufferGeometry();
    const pos = new Float32Array(DUST_N * 3);
    const seed = new Float32Array(DUST_N);
    for (let i = 0; i < DUST_N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = Math.random() * 10;
      pos[i * 3 + 2] = -Math.random() * NAVE * 12;
      seed[i] = Math.random() * Math.PI * 2;
    }
    geometry.setAttribute("position", new BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seed, 1));
    return geometry;
  }, []);
  useEffect(
    () => () => {
      tex.dispose();
      geo.dispose();
    },
    [tex, geo],
  );
  useFrame(({ clock }) => {
    const mesh = points.current;
    if (!mesh) return;
    const vis = introField();
    mesh.visible = vis > 0.02;
    const mat = mesh.material;
    if (!Array.isArray(mat) && "opacity" in mat) mat.opacity = 0.35 * vis;
  });
  return (
    <points ref={points} geometry={geo} frustumCulled={false} raycast={noopRaycast}>
      <pointsMaterial
        map={tex}
        color="#e8d8c0"
        size={0.16}
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={AdditiveBlending}
        fog={false}
        toneMapped={false}
        sizeAttenuation
      />
    </points>
  );
}

function BirthNebula() {
  const points = useRef<Points>(null);
  const tex = useMemo(() => makeStarSprite(), []);
  const geo = useMemo(() => buildBirthNebula(), []);
  const mat = useMemo(() => makeNebulaMaterial(tex), [tex]);
  useEffect(
    () => () => {
      tex.dispose();
      geo.dispose();
      mat.dispose();
    },
    [tex, geo, mat],
  );
  useFrame(({ clock }) => {
    const mesh = points.current;
    if (!mesh) return;
    const assemble = uAssemble();
    const playing = introPlaying();
    const hold = playing ? 1 : Math.max(0, 1 - assemble);
    const fade = playing ? 1 - Math.max(0, (assemble - 0.7) / 0.3) : hold;
    mesh.visible = fade > 0.02;
    if (!mesh.visible) return;
    mesh.position.copy(TEMPLE_STATIONS[0]!);
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uBirth.value = uBirth();
    mat.uniforms.uAssemble.value = assemble;
    mat.uniforms.uOpacity.value = fade;
  });
  return (
    <points
      ref={points}
      geometry={geo}
      material={mat}
      frustumCulled={false}
      renderOrder={12}
      raycast={noopRaycast}
    />
  );
}

function Station({ index, sign, eager }: { index: number; sign: TempleSign; eager: boolean }) {
  const volumeGated = hasVolumeSign(sign.id);
  // Volume geometry loads async from the sign's PNG — until it's actually
  // ready, stay on the plate + denseCloud path instead of hiding the plate
  // for a shell that has no geometry yet (or never builds one).
  const volReady = useRef(volumeGated && Boolean(getSignVolume(sign.id)));
  const [, bumpVolReady] = useState(0);
  const useVolume = volumeGated && volReady.current;
  const group = useRef<Group>(null);
  const cores = useRef<Points>(null);
  const art = useRef<Mesh>(null);
  const shown = useRef(false);
  const hydrated = useRef(false);
  const wantArt = useRef(eager);
  const tint = useMemo(() => {
    const c = new Color(sign.palette.particle);
    c.lerp(new Color(ELEMENT_TINT[sign.element]), 0.2);
    return c;
  }, [sign.palette.particle, sign.element]);
  const coreMat = useMemo(() => makeSparkMaterial(), []);
  const morphPairs = useMemo(() => {
    const c = CONSTELLATIONS.find((x) => x.id === sign.id);
    return c ? pairFigures(c.animal, c.glyph) : [];
  }, [sign.id]);
  const morphLevel = useRef(0);
  const slideX = useRef(0);
  const slideY = useRef(0);
  const scaleBoost = useRef(1);
  const [artTex, setArtTex] = useState<CanvasTexture | null>(() =>
    eager ? loadSignArt(sign.id) : null,
  );
  const n = CLOUD_N;
  const scatter = useRef<Vector3[] | null>(null);
  const starGeo = useMemo(() => {
    const g = new BufferGeometry();
    if (eager) {
      scatter.current = makeScatter(index, n);
      const cloud = useVolume ? interiorCloud(sign.id, n) : denseCloud(sign.id, n);
      fillMorphCloud(g, cloud, scatter.current, n, morphPairs);
      hydrated.current = cloud.length > n * 0.4;
    } else {
      g.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
      g.setDrawRange(0, 0);
    }
    return g;
  }, [eager, index, n, sign.id, morphPairs, useVolume]);
  const pick = () => useSessionStore.getState().openClaim(sign.id);

  useEffect(() => {
    return () => {
      coreMat.dispose();
      starGeo.dispose();
    };
  }, [coreMat, starGeo]);

  useEffect(() => {
    if (artTex) return;
    const id = window.setTimeout(() => setArtTex(loadSignArt(sign.id)), 420 + index * 85);
    return () => window.clearTimeout(id);
  }, [artTex, index, sign.id]);

  useFrame(({ clock, camera }, dt) => {
    const g = group.current;
    const mesh = cores.current;
    if (!g || !mesh) return;
    if (volumeGated && !volReady.current && getSignVolume(sign.id)) {
      volReady.current = true;
      bumpVolReady((n) => n + 1);
    }
    const state = useSessionStore.getState();
    const chatting = state.claim !== null && state.session === null;
    const shelf = state.session?.kind === "shelf" ? state.session : null;
    const picked = chatting && state.claim?.signId === sign.id;
    const held = picked || shelf?.signId === sign.id;
    const t = galaxyTravel.t;
    const direct = galaxyTravel.seekDirect && galaxyTravel.seek != null;
    const dest = stationT(index);
    const dist = Math.abs(t - dest);
    const incoming = index === Math.min(11, stationFromT(t) + 1);
    const focused = held || index === aimedIndex() || index === stationFromT(t);
    const ready = plateReady(sign.id);
    if (!artTex && (focused || incoming || ready) && !wantArt.current) {
      wantArt.current = true;
      queueMicrotask(() => setArtTex(loadSignArt(sign.id)));
    }
    if (introPlaying() && index !== 0 && !held) {
      g.visible = false;
      return;
    }
    if (direct && !held && index !== aimedIndex()) {
      g.visible = false;
      return;
    }
    const fade = held
      ? 1
      : direct && index === aimedIndex()
        ? Math.max(0.35, smooth(1 - Math.min(1, dist / 0.22)))
        : smooth(1 - Math.min(1, dist / 0.08));
    const show = held || dist < 0.078 || (direct && index === aimedIndex());
    g.visible = show;
    if (!show) return;

    const sit = TEMPLE_STATIONS[index]!;
    const cam = camera as PerspectiveCamera;
    _sitCam.copy(sit);
    cam.worldToLocal(_sitCam);
    const volEarly = getSignVolume(sign.id);
    const plateAspect = volEarly?.aspect ?? (artTex ? artAspect(artTex) : 16 / 9) ?? 16 / 9;
    const slide = computeBirthChatSlide({
      picked,
      travelT: t,
      stationT: dest,
      fov: cam.fov,
      sitCameraZ: _sitCam.z,
      aspect: cam.aspect,
      cssWidth: cssViewWidth(),
      plateWide: PLATE_WIDE,
      plateAspect,
      currentScale: scaleBoost.current,
    });
    slideX.current = lerpToward({ current: slideX.current, target: slide.offsetX, dt, rate: 2.2 });
    slideY.current = lerpToward({ current: slideY.current, target: slide.offsetY, dt, rate: 2.2 });
    scaleBoost.current = lerpToward({
      current: scaleBoost.current,
      target: slide.targetScale,
      dt,
      rate: 2.2,
    });

    g.position.copy(sit);
    g.quaternion.copy(camera.quaternion);
    g.translateX(slideX.current);
    g.translateY(slideY.current);
    g.scale.setScalar(scaleBoost.current);

    if (artTex) hydrateSignArt(sign.id, artTex);
    const vol = volEarly;
    if (!hydrated.current && (focused || incoming || held || eager || ready)) {
      if (!scatter.current) scatter.current = makeScatter(index, n);
      const cloud = useVolume ? interiorCloud(sign.id, n) : denseCloud(sign.id, n);
      if (cloud.length > n * 0.4) {
        fillMorphCloud(starGeo, cloud, scatter.current, n, morphPairs);
        hydrated.current = true;
      }
    }

    const aspect = vol?.aspect ?? (artTex ? artAspect(artTex) : 16 / 9) ?? 16 / 9;
    const wide = PLATE_WIDE;
    const arrive = index === 0 ? introAries() : 1;
    const along = smooth(1 - Math.min(1, dist / 0.072));
    const gather = held ? 1 : introPlaying() && index === 0 ? Math.max(0.02, arrive) : along;
    const plateReveal = held
      ? 1
      : introPlaying() && index === 0
        ? Math.max(0, (arrive - 0.12) / 0.62)
        : smooth(Math.max(0, (gather - 0.52) / 0.48));

    if (art.current && artTex && !useVolume) {
      const mat = art.current.material as MeshBasicMaterial;
      const plateOn = Boolean(artTex && (artReady(artTex) || ready));
      const bornIn = plateReveal;
      // Plate opacity via tested helper — fully opaque during BirthChat, no plateMorphFade.
      const plateOp = computePlateOpacity({
        plateOn,
        held,
        focused,
        fade,
        bornIn,
        morphLevel: morphLevel.current,
      });
      art.current.visible = plateOp > 0.04;
      art.current.scale.set(wide, wide / aspect, 1);
      mat.opacity = plateOp;
      mat.map = artTex;
      mat.depthTest = false;
      mat.alphaTest = 0.04;
      if (plateOn && !shown.current) {
        artTex.needsUpdate = true;
        mat.needsUpdate = true;
        shown.current = true;
      }
    }

    if (!focused && !incoming && !held) {
      mesh.visible = false;
      return;
    }
    if (introPlaying() && index === 0 && introAries() < 0.1) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const morphTarget = picked ? 1 : 0;
    // Faster in (star formation feels snappy), slower out (dissolve back gracefully)
    const morphRate = prefersReducedMotion() ? 20 : picked ? 1.8 : 1.2;
    morphLevel.current += (morphTarget - morphLevel.current) * Math.min(1, dt * morphRate);
    const ml = morphLevel.current;
    const u = coreMat.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uGather.value = gather;
    u.uWide.value = wide;
    u.uTall.value = wide / aspect;
    u.uMorph.value = ml;
    // Group slide handles X positioning; per-star bias causes double-shift
    u.uGlyphBiasX.value = 0;
    // Swirl dampens as morph settles; halo/spiral fade so glyph reads clean
    u.uSwirl.value = prefersReducedMotion() ? 0 : 1 - ml * 0.9;
    u.uFade.value = fade;
    u.uHover.value = galaxyTravel.ptrOn && focused ? 1.12 : 1;
    u.uPxScale.value = SMALL ? 0.9 : 1;
    u.uBaseSize.value = SMALL ? 2.6 : 2.05;
    // Boost opacity when forming glyph so stars are crisp and visible
    u.uOpacity.value = (0.62 + fade * 0.32) * (1 + ml * 0.55);
    (u.uTint.value as Color).copy(tint);
  });

  return (
    <group ref={group} frustumCulled={false}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          pick();
        }}
      >
        <sphereGeometry args={[7.4, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh
        ref={art}
        position={[0, 0.05, -0.06]}
        visible={false}
        renderOrder={18}
        frustumCulled={false}
        raycast={noopRaycast}
        dispose={null}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={artTex ?? undefined}
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          fog={false}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      {useVolume ? (
        <group position={[0, 0.05, -0.06]}>
          <Suspense fallback={null}>
            <SignShell signId={sign.id} plateWide={PLATE_WIDE} />
          </Suspense>
        </group>
      ) : null}
      <points
        ref={cores}
        geometry={starGeo}
        material={coreMat}
        frustumCulled={false}
        raycast={noopRaycast}
      />
      <BigThreeLights signId={sign.id} />
    </group>
  );
}

function BigThreeLights({ signId }: { signId: string }) {
  const shelf = useShelfSession();
  const natal = shelf?.skyNatal;
  const held = shelf?.signId === signId;
  if (!natal || !held) return null;
  const spots: {
    id: "sun" | "moon" | "asc";
    p: [number, number, number];
    color: string;
    s: number;
  }[] = [
    { id: "sun", p: [0, 0.22, 0.55], color: "#e6c98a", s: 0.17 },
    { id: "moon", p: [-1.32, 0.06, 0.28], color: "#d7c4c8", s: 0.14 },
    { id: "asc", p: [1.4, 0.42, 0.22], color: "#c5d0e8", s: 0.13 },
  ];
  return (
    <group>
      {spots.map((sp) => {
        const b = natal.bodies.find((x) => x.id === sp.id);
        if (!b) return null;
        return (
          <mesh
            key={sp.id}
            position={sp.p}
            renderOrder={20}
            onClick={(e) => {
              e.stopPropagation();
              const state = useSessionStore.getState();
              state.select({ kind: "planet", id: sp.id });
              state.setMode("ask");
            }}
          >
            <sphereGeometry args={[sp.s, 12, 10]} />
            <meshBasicMaterial color={sp.color} toneMapped={false} transparent opacity={0.92} />
          </mesh>
        );
      })}
    </group>
  );
}

function ChartRing() {
  const group = useRef<Group>(null);
  const shelf = useShelfSession();
  const show = Boolean(shelf?.skyNatal);
  const signId = shelf?.signId;
  const sprites = useMemo(() => makeCircleTexture(), []);
  useEffect(() => () => sprites.dispose(), [sprites]);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = show;
    if (!show || !signId) return;
    const i = Math.max(
      0,
      TEMPLE_SIGNS.findIndex((s) => s.id === signId),
    );
    const sit = TEMPLE_STATIONS[i] ?? TEMPLE_STATIONS[0]!;
    g.position.set(sit.x, sit.y - 1.1, sit.z);
  });
  const planets = useMemo(() => {
    return Array.from({ length: 10 }, (_, k) => {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(a) * 5.2, z: Math.sin(a) * 5.2, s: 0.08 + (k % 3) * 0.03 };
    });
  }, []);
  return (
    <group ref={group} visible={false}>
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={noopRaycast}>
        <torusGeometry args={[5.2, 0.018, 6, 64]} />
        <meshBasicMaterial color="#d8cfc0" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      {planets.map((p, k) => (
        <mesh key={k} position={[p.x, 0, p.z]} raycast={noopRaycast}>
          <sphereGeometry args={[p.s, 8, 6]} />
          <meshBasicMaterial color="#f0e6d0" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function TempleRig() {
  const { camera, scene, size } = useThree();
  const current = useRef(galaxyTravel.t);
  const lastStation = useRef(0);
  const epoch = useRef(galaxyTravel.epoch);
  const lastPub = useRef(-1);
  const booted = useRef(false);
  const diveAmount = useRef(0);

  useEffect(() => {
    ensureAutoClock();
    ensureFlyInput();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useSessionStore.getState();
      if (state.claim) return;
      if (state.session) return;
      if (introPlaying()) {
        if (introCanSkip()) {
          skipIntro();
          galaxyTravel.birth = 1;
          useGalaxy.getState().markBorn();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S" || e.key === "ArrowRight") {
        galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget + 0.045);
        galaxyTravel.hold = 1;
        galaxyTravel.wheelUntil = performance.now() + 220;
        galaxyTravel.moved = true;
        galaxyTravel.handsOn = true;
        noteControl();
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === "ArrowLeft") {
        galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget - 0.045);
        galaxyTravel.hold = -1;
        galaxyTravel.wheelUntil = performance.now() + 220;
        galaxyTravel.moved = true;
        galaxyTravel.handsOn = true;
        noteControl();
      } else if (e.key === "Enter" && galaxyTravel.birth < 1) {
        skipBirth();
        useGalaxy.getState().markBorn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((_, delta) => {
    const d = Math.min(0.05, Math.max(0.001, delta));
    if (epoch.current !== galaxyTravel.epoch) {
      epoch.current = galaxyTravel.epoch;
      current.current = galaxyTravel.t;
      galaxyTravel.tTarget = galaxyTravel.t;
      booted.current = false;
    }
    if (stepBirth(d)) {
      useGalaxy.getState().markBorn();
      galaxyTravel.awaken = 1;
    } else if (galaxyTravel.birth >= 1) {
      useGalaxy.getState().markBorn();
      if (galaxyTravel.awaken < 0.2) galaxyTravel.awaken = 1;
    }
    stepIntro(d);
    const state = useSessionStore.getState();
    const chatting = state.claim !== null && state.session === null;
    const arriving = introPlaying();
    const sought = stepSeek(current.current, d);
    if (sought.active) {
      current.current = sought.t;
      galaxyTravel.tTarget = sought.t;
    }
    if (chatting) {
      const i = CONSTELLATIONS.findIndex((c) => c.id === state.claim?.signId);
      if (i >= 0) galaxyTravel.tTarget = stationT(i);
    } else if (!arriving && !sought.active) {
      const hands = galaxyTravel.dragging || performance.now() < galaxyTravel.wheelUntil;
      galaxyTravel.handsOn = hands;
      if (hands && galaxyTravel.hold !== 0) {
        galaxyTravel.tTarget = clamp01(
          galaxyTravel.tTarget + galaxyTravel.hold * HOLD_FLY * d * 0.22,
        );
      }
      galaxyTravel.steer = 0;
    }
    galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget);
    const k = arriving ? 1 : 1 - Math.exp(-d * (sought.active ? 2.6 : 2.9));
    current.current += (galaxyTravel.tTarget - current.current) * (arriving ? 1 : k);
    current.current = clamp01(current.current);
    const t = current.current;
    TEMPLE_CURVE.getPointAt(t, _chest);
    const aspect = viewAspect(size);
    const idx = stationFromT(t);
    stepZoom(d, idx !== lastStation.current);
    lastStation.current = idx;
    const vol = getSignVolume(TEMPLE_SIGNS[idx]!.id);
    const plateA = vol?.aspect ?? 16 / 9;
    const shelfOn = state.session?.kind === "shelf";
    const well = chatting || shelfOn ? { top: 0.12, bottom: 0.48 } : { top: 0.15, bottom: 0.24 };
    const frame = heroFrame(aspect, arriving ? introCam() : 1, plateA, PLATE_WIDE, well);
    const zoom = arriving ? 1 : Math.max(1, galaxyTravel.zoom);
    const pull = 1 - introCam();
    _cam.copy(_chest);
    _cam.z += frame.z / zoom;
    _cam.y += frame.y / (0.72 + zoom * 0.28) + pull * 0.35;
    _look.copy(_chest);
    _look.z -= 1.4 + introCam() * 1.0;
    _look.y += frame.portrait ? 0.05 : 0.15;
    if (!arriving) {
      _look.x += galaxyTravel.ptrX * 1.1;
      _look.y += -galaxyTravel.ptrY * 0.6;
      _cam.x += galaxyTravel.ptrX * 0.35;
      _cam.y += galaxyTravel.ptrY * 0.2;
    }
    // Local dive: while a volume-gated station is held (BirthChat or shelf),
    // ease the camera a small step toward the shell/station center. Does not
    // alter the travel curve, target station, or look-at math above.
    const heldSignId = chatting ? state.claim?.signId : shelfOn ? state.session?.signId : undefined;
    const diveTarget = heldSignId && hasVolumeSign(heldSignId) ? 0.35 * PLATE_WIDE : 0;
    diveAmount.current = lerpToward({
      current: diveAmount.current,
      target: diveTarget,
      dt: d,
      rate: 2.2,
    });
    if (diveAmount.current > 0.0005) _cam.z -= diveAmount.current;
    if (!Number.isFinite(_cam.x) || !Number.isFinite(_look.x)) return;
    camera.up.copy(_up);
    if (!booted.current || arriving) {
      camera.position.copy(_cam);
      camera.lookAt(_look);
      booted.current = true;
    } else {
      camera.position.lerp(_cam, k);
      camera.lookAt(_look);
    }
    if (camera instanceof PerspectiveCamera) {
      camera.far = 2500;
      const fovWant = chatting
        ? Math.min(52, frame.fov)
        : arriving
          ? frame.fov - (1 - introCam()) * 4
          : frame.fov / (0.92 + (zoom - 1) * 0.18);
      if (arriving || Math.abs(camera.fov - fovWant) > 3) camera.fov = fovWant;
      else camera.fov += (fovWant - camera.fov) * k;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    if (scene.fog instanceof FogExp2) {
      lerpFog(t, _fog);
      scene.fog.color.copy(_fog);
      scene.background = _fog.clone().multiplyScalar(0.35);
    }
    galaxyTravel.t = t;
    if (galaxyTravel.moved) galaxyTravel.awaken = 1;
    if (
      Math.abs(t - lastPub.current) > 0.004 ||
      galaxyTravel.moved !== useGalaxy.getState().moved
    ) {
      lastPub.current = t;
      publishTravel(t, galaxyTravel.moved);
    }
  });

  return null;
}
