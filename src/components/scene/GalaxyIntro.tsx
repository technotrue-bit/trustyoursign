import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  FogExp2,
  Group,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { isSmallGpu } from "@/lib/gpu";
import { CONSTELLATIONS, ELEMENT_TINT, pairFigures } from "@/lib/galaxy/constellations";
import {
  PLATE_DISSOLVE_GLSL,
  burstParams,
  plateDissolveUniforms,
  plateHubUv,
  type PlateDissolveUniforms,
} from "@/lib/galaxy/signBurst";
import type { SignId } from "@/lib/chart/types";
import {
  EXPLORE_ZOOM_MAX,
  EXPLORE_ZOOM_MIN,
  INSIDE_LANDING_DISTANCE,
  MAX_FLY_T,
  PORTAL_CUT,
  SETTLED_VEL,
  aimedIndex,
  cameraSettledOn,
  capFlightStep,
  dwellClipMayPlay,
  ensureAutoClock,
  stopAutoClock,
  ensureFlyInput,
  enterAnimating,
  enterSignGalaxy,
  exitSignGalaxy,
  exploringSign,
  galaxyTravel,
  noteControl,
  prefersReducedMotion,
  publishTravel,
  skipBirth,
  skipEnterGalaxy,
  stepBirth,
  stepCorridorFlight,
  stepExplore,
  stepSelectionHold,
  stepSeek,
  stepShaderTime,
  stepSign,
  stepZoom,
  portalActive,
  portalEnvelope,
  portalTailing,
} from "@/lib/galaxy/travel";
import { SETTLE_DIST } from "@/lib/galaxy/dwellClip";
import {
  enterHubSettle,
  getSignGalaxy,
  insideHardGateHidesLeftovers,
} from "@/lib/galaxy/signGalaxy";
import {
  bootIntro,
  introCam,
  introCanSkip,
  introField,
  introPlaying,
  introAries,
  skipIntro,
  stepIntro,
  templeIntro,
  uAssemble,
  uBirth,
} from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  ELEMENT_CODE,
  fillMorphCloud,
  makeSparkMaterial,
  setCloudDrawRange,
} from "@/lib/galaxy/starRender";
import {
  computeBirthChatSlide,
  lerpToward,
  computePlateOpacity,
} from "@/lib/galaxy/birthchat-slide";
import { galaxyLayerName } from "@/lib/galaxy/layers";
import {
  CLOUD_GAIN_IDLE,
  cloudBurstGain,
  fieldGather,
  parkedBand,
  plateGeometry,
  signsPastStation,
  signArrive,
  stepArriveBurst,
} from "@/lib/galaxy/signField";
import {
  DWELL_ASPECT_MATCH_EPS,
  DWELL_CROSSFADE_SEC,
  DWELL_LIFE_PLATE_NUDGE_PX,
  DWELL_PLATE_REF,
  dwellClipFor,
  dwellVideoFrameReady,
  pauseDwellClip,
  primeDwellClip,
  stopDwellClip,
  syncDwellPrefetch,
} from "@/lib/galaxy/dwellClip";
import {
  loadSignArt,
  preloadSignArt,
  preloadSignArtNear,
  releaseSignArt,
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
  primeSignVolumeNear,
  type SignVolume,
} from "@/lib/galaxy/signVolume";
import { buildBirthNebula, makeNebulaMaterial } from "@/lib/galaxy/nebula";
import { makeStarSprite } from "@/lib/galaxy/celestial";
import { starRenderProfile } from "@/lib/galaxy/starAppearance";
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
import { NebulaBackdrop } from "./NebulaBackdrop";
import { CornerGalaxies } from "./CornerGalaxies";
import { SignShell } from "./SignShell";
import { SignGalaxyField, pointLocalOffset } from "./SignGalaxyField";
import { getFigureMatch, landingBiasNdc } from "@/lib/galaxy/signAlign";
import { offsetExploreLookPose } from "@/lib/galaxy/exploreLookPose";

const SMALL = typeof window !== "undefined" && isSmallGpu();
const STAR_PROFILE = starRenderProfile(SMALL);
const DUST_N = STAR_PROFILE.dustCount;
const CLOUD_N = STAR_PROFILE.stationCount;

const _cam = new Vector3();
const _look = new Vector3();
const _chest = new Vector3();
const _fog = new Color();
const _fogGoal = new Color();
const _bg = new Color();
const _accent = new Color();
const _up = new Vector3(0, 1, 0);
const _sitCam = new Vector3();
const _camRight = new Vector3();
const _camUp = new Vector3();
const _hub = new Vector3();
const _hubNdc = new Vector3();

/** Enter flythrough: where the inside camera comes to rest relative to the hub star. */
export const HUB_STANDOFF = INSIDE_LANDING_DISTANCE;

/** Share of the corridor dust hidden at top speed: less streaming past the eyes. */
const DUST_MOTION_DIM = 0.6;

/** Corridor weight each station drew last frame, for the pieces it parents. */
const stationWeight = new Float32Array(TEMPLE_SIGNS.length).fill(1);
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __tysPlates?: Float32Array }).__tysPlates = stationWeight;
}

let cachedViewW = 1280;
let cachedViewH = 900;
let viewCacheBound = false;

function bindViewCache() {
  if (viewCacheBound || typeof window === "undefined") return;
  viewCacheBound = true;
  const sync = () => {
    cachedViewW = window.visualViewport?.width ?? window.innerWidth;
    cachedViewH = window.visualViewport?.height ?? window.innerHeight;
  };
  sync();
  window.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
}

function cssViewWidth() {
  bindViewCache();
  if (typeof window === "undefined") return 1280;
  return cachedViewW;
}

/** CSS viewport height — short frames need the core framed higher (see landingBiasNdc). */
function cssViewHeight() {
  bindViewCache();
  if (typeof window === "undefined") return 900;
  return cachedViewH;
}

/** One session read per frame for all 12 Stations — filled by TempleRig. */
type FrameSessionSnap = {
  chatting: boolean;
  claimSignId: string | null;
  shelfSignId: string | null;
};
let frameSession: FrameSessionSnap = {
  chatting: false,
  claimSignId: null,
  shelfSignId: null,
};

function syncFrameSession() {
  const state = useSessionStore.getState();
  frameSession = {
    chatting: state.claim !== null && state.session === null,
    claimSignId: state.claim?.signId ?? null,
    shelfSignId: state.session?.kind === "shelf" ? state.session.signId : null,
  };
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

type PlatePlan = { u: number; v: number; aspect: number };

/**
 * Where the painting ignites, in plate UV.
 *
 * The hub star is the seed inside the figure's body, and `figureMatch` is the
 * transform signAlign measures at runtime to lay the live figure exactly over the
 * painted one — so this is measured, never guessed, and it works for any sign.
 * Called at most once per enter (the caller caches it).
 */
function measurePlatePlan(signId: SignId, vol: SignVolume | null): PlatePlan | null {
  if (!vol) return null;
  const galaxy = getSignGalaxy(signId);
  const match = getFigureMatch(signId, galaxy);
  const hub = galaxy.points[0];
  if (!match || !hub) return null;
  const uv = plateHubUv(match, hub, PLATE_WIDE, vol.aspect);
  return { u: uv.u, v: uv.v, aspect: vol.aspect };
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
        preloadSignArtNear(0);
        primeSignVolumeNear(0);
        primeSignArt("aries");
        primeSignArt("taurus");
        primeSignArt("gemini");
      },
      SMALL ? 700 : 480,
    );
    return () => {
      window.clearTimeout(skyT);
      window.clearTimeout(restT);
      stopDwellClip();
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
      <color attach="background" args={["#0c0b0a"]} />
      <ambientLight intensity={0.08} color="#c8b8a0" />
      <hemisphereLight args={["#1a1820", "#080706", 0.18]} />
      <StationLight />
      {sky ? (
        <Suspense fallback={null}>
          <NebulaBackdrop />
        </Suspense>
      ) : null}
      {sky ? <CelestialSky /> : null}
      {sky ? <CornerGalaxies /> : null}
      {sky ? <Dust /> : null}
      <BirthNebula />
      {TEMPLE_SIGNS.map((sign, i) => (
        <Station key={sign.id} index={i} sign={sign} eager={i <= 2} />
      ))}
      {sky ? <ArriveBurstTicker /> : null}
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

/**
 * Headless: ticks the shared land-burst state once per frame so the station
 * cloud still gets its arrival swirl/glow kick. This used to live inside the
 * sign disk's frame loop; the disk itself is gone.
 */
function ArriveBurstTicker() {
  useFrame((_, dt) => {
    const idx = aimedIndex();
    if (!TEMPLE_SIGNS[idx]) return;
    stepArriveBurst(signArrive, {
      aimed: idx,
      // A portal parks t on the target at the cut while the camera is still a half-sign out.
      dist: Math.abs(galaxyTravel.t - stationT(idx)) + Math.abs(galaxyTravel.portalSigns) / 11,
      dt,
      reduced: prefersReducedMotion(),
      paused: exploringSign() || introPlaying() || enterAnimating(),
    });
  });
  return null;
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
  const calm = useRef(1);
  useFrame(({ clock }, dt) => {
    const mesh = points.current;
    if (!mesh) return;
    const rush = exploringSign() ? 0 : Math.min(1, Math.abs(galaxyTravel.vel) / MAX_FLY_T);
    calm.current = lerpToward({
      current: calm.current,
      target: 1 - DUST_MOTION_DIM * rush,
      dt,
      rate: 4,
    });
    // Dust is world-anchored: dip it through a portal cut so its dots don't visibly jump.
    const dip = portalActive() ? smooth(Math.abs(galaxyTravel.portalCamV - PORTAL_CUT) / 0.2) : 1;
    const vis = introField() * (exploringSign() ? galaxyTravel.worldFade : 1) * calm.current * dip;
    mesh.visible = vis > 0.02;
    const mat = mesh.material;
    if (!Array.isArray(mat) && "opacity" in mat) mat.opacity = 0.35 * vis;
  });
  return (
    <points
      ref={points}
      key={galaxyLayerName("dust-field")}
      name={galaxyLayerName("dust-field")}
      geometry={geo}
      frustumCulled={false}
      raycast={noopRaycast}
    >
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
    const fieldOn = introField() > 0.02;
    mesh.visible = fade > 0.02 && fieldOn;
    if (!mesh.visible) return;
    mesh.position.copy(TEMPLE_STATIONS[0]!);
    mat.uniforms.uTime.value = galaxyTravel.shaderTime;
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

/** Give up starting a clip that never leaves frame 0, then let the walk continue. */
const DWELL_START_GIVE_UP_SEC = 4;

function bindDwellTexture(
  video: HTMLVideoElement,
  prev: VideoTexture | null,
  plateAspect: number,
  signId: SignId,
): VideoTexture {
  if (prev && prev.image === video) {
    fitDwellCoverUv(prev, video, plateAspect, signId);
    return prev;
  }
  if (prev) {
    try {
      prev.dispose();
    } catch {
      /* element already detached */
    }
  }
  const tex = new VideoTexture(video);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  fitDwellCoverUv(tex, video, plateAspect, signId);
  return tex;
}

/** Map the life clip into the still plate. Near-matching aspects skip the cover crop. */
function fitDwellCoverUv(
  tex: VideoTexture,
  video: HTMLVideoElement,
  plateAspect: number,
  signId: SignId,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  if (vw < 3 || vh < 3 || !Number.isFinite(plateAspect) || plateAspect <= 0) {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    return;
  }
  const va = vw / vh;
  if (Math.abs(va - plateAspect) <= DWELL_ASPECT_MATCH_EPS) {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  } else if (va > plateAspect) {
    const scale = va / plateAspect;
    tex.repeat.set(1 / scale, 1);
    tex.offset.set((1 - 1 / scale) / 2, 0);
  } else {
    const scale = plateAspect / va;
    tex.repeat.set(1, 1 / scale);
    tex.offset.set(0, (1 - 1 / scale) / 2);
  }
  const nudge = DWELL_LIFE_PLATE_NUDGE_PX[signId];
  if (nudge) {
    tex.offset.x -= nudge.x / DWELL_PLATE_REF.w;
    tex.offset.y += nudge.y / DWELL_PLATE_REF.h;
  }
}

let dwellPoseFallback: CanvasTexture | null = null;

function dwellPoseFallbackTexture(): CanvasTexture {
  if (dwellPoseFallback) return dwellPoseFallback;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  dwellPoseFallback = tex;
  return tex;
}

let dwellPoseStage: {
  scene: Scene;
  cam: OrthographicCamera;
  mat: ShaderMaterial;
} | null = null;

function dwellPoseStageOnce() {
  if (dwellPoseStage) return dwellPoseStage;
  const mat = new ShaderMaterial({
    uniforms: { tMap: { value: null } },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = vec4(position.xy, 0.0, 1.0);",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D tMap;",
      "varying vec2 vUv;",
      "void main() {",
      "  gl_FragColor = texture2D(tMap, vUv);",
      "}",
    ].join("\n"),
  });
  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), mat));
  dwellPoseStage = {
    scene,
    cam: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    mat,
  };
  return dwellPoseStage;
}

/**
 * Draw frame 0 through the same sampler the plate uses, into a linear target.
 * A canvas grab and a raw texture copy are different texels, and that gap is
 * the brightness step at both cuts.
 */
function renderDwellPose(
  gl: WebGLRenderer,
  videoTex: VideoTexture,
  slot: { current: WebGLRenderTarget | null },
): Texture | null {
  const video = videoTex.image as HTMLVideoElement;
  const w = video?.videoWidth ?? 0;
  const h = video?.videoHeight ?? 0;
  if (w < 3 || h < 3) return null;
  let rt = slot.current;
  if (!rt || rt.width !== w || rt.height !== h) {
    rt?.dispose();
    rt = new WebGLRenderTarget(w, h, {
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    });
    rt.texture.colorSpace = LinearSRGBColorSpace;
    rt.texture.generateMipmaps = false;
    rt.texture.minFilter = LinearFilter;
    rt.texture.magFilter = LinearFilter;
    rt.texture.wrapS = ClampToEdgeWrapping;
    rt.texture.wrapT = ClampToEdgeWrapping;
    slot.current = rt;
  }
  const stage = dwellPoseStageOnce();
  stage.mat.uniforms.tMap!.value = videoTex;
  const prevTone = gl.toneMapping;
  const prevTarget = gl.getRenderTarget();
  gl.toneMapping = NoToneMapping;
  gl.setRenderTarget(rt);
  gl.render(stage.scene, stage.cam);
  gl.setRenderTarget(prevTarget);
  gl.toneMapping = prevTone;
  return rt.texture;
}

function releaseDwellTexture(
  mat: MeshBasicMaterial | null,
  still: CanvasTexture | null,
  slot: { current: VideoTexture | null },
) {
  const tex = slot.current;
  if (mat && tex && mat.map === tex) mat.map = still;
  if (!tex) return;
  slot.current = null;
  try {
    tex.dispose();
  } catch {
    /* element already detached */
  }
}

/** True when this station should build its star cloud before the viewer reaches it. */
function stationCloudApproach(index: number, t: number) {
  const cur = stationFromT(t);
  if (Math.abs(index - cur) <= 1) return true;
  const aim = aimedIndex(t);
  return Math.abs(index - aim) <= 1;
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
  const plateMat = useRef<MeshBasicMaterial>(null);
  const platePlan = useRef<PlatePlan | null>(null);
  const plateBurst = useRef<
    | (PlateDissolveUniforms & {
        uDissolve: { value: number };
        uHubUv: { value: Vector2 };
        uAspect: { value: number };
        uLifeKey: { value: number };
      })
    | null
  >(null);
  const dwellTex = useRef<VideoTexture | null>(null);
  const dwellPoseRt = useRef<WebGLRenderTarget | null>(null);
  const dwellPoseUniforms = useRef<{
    uStillMap: { value: CanvasTexture | null };
    uPoseMap: { value: Texture | null };
    uPoseReady: { value: number };
  } | null>(null);
  const dwellStall = useRef(0);
  const dwellBlend = useRef(0);
  const dwellPhase = useRef<"idle" | "wait" | "in" | "play" | "out">("idle");
  const dwellEnded = useRef(false);
  /** True while a hidden play/pause is decoding frame 0. The fade stays on the still. */
  const dwellHold = useRef(false);
  /** Still plate after the fade, before the walk. The sky must not move on the cut. */
  const dwellRest = useRef(0);
  const lifeArt = useRef<Mesh>(null);
  const lifeMat = useRef<MeshBasicMaterial | null>(null);
  const shellWrap = useRef<Group>(null);
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
  /** Parked-band weight, eased so a landing never pops the plate to full. */
  const parkedEase = useRef(eager && index === 0 ? 1 : 0);
  /** Halo aliveness: 0 while steering/wheeling/dragging/seeking, eased to
   * 1 over ~1s once the camera settles on this station (cameraSettledOn). */
  const lifeEase = useRef(0);
  const [artTex, setArtTex] = useState<CanvasTexture | null>(() =>
    eager ? loadSignArt(sign.id) : null,
  );
  const n = CLOUD_N;
  const scatter = useRef<Vector3[] | null>(null);
  const starGeo = useMemo(() => {
    const g = new BufferGeometry();
    // Cold boot builds only the landing sign's cloud; neighbours hydrate on approach.
    if (index === 0) {
      scatter.current = makeScatter(index, n);
      const cloud = useVolume ? interiorCloud(sign.id, n) : denseCloud(sign.id, n);
      fillMorphCloud(g, cloud, scatter.current, n, morphPairs);
      hydrated.current = cloud.length > n * 0.4;
    } else {
      g.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
      g.setDrawRange(0, 0);
    }
    return g;
  }, [index, n, sign.id, morphPairs, useVolume]);
  const pick = () => {
    if (enterAnimating()) return;
    if (exploringSign()) {
      // Inside: look / star travel stay live. Claim is the HUD CTA — a hub
      // tap must not open BirthChat (that sets busy and freezes look).
      return;
    }
    enterSignGalaxy(index);
  };

  useEffect(() => {
    return () => {
      coreMat.dispose();
      starGeo.dispose();
      releaseSignArt(artTex);
      const tex = dwellTex.current;
      dwellTex.current = null;
      if (tex) {
        try {
          tex.dispose();
        } catch {
          /* element already detached */
        }
      }
    };
  }, [coreMat, starGeo, artTex]);

  const shellMats = useRef<{ opacity?: number; transparent?: boolean }[]>([]);
  useEffect(() => {
    const wrap = shellWrap.current;
    if (!wrap) return;
    const mats: { opacity?: number; transparent?: boolean }[] = [];
    wrap.traverse((obj) => {
      const mat = (obj as Mesh).material as { opacity?: number; transparent?: boolean } | undefined;
      if (mat && typeof mat.opacity === "number") mats.push(mat);
    });
    shellMats.current = mats;
  });

  /**
   * The painted plate is consumed outward from its hub during the enter. The mask
   * is a shader pass on the existing plate material — the plate's own opacity path
   * is untouched, this only multiplies the sampled alpha by the erode mask, so the
   * verified plate fade still owns when the painting dies.
   */
  useEffect(() => {
    const mat = plateMat.current;
    if (!mat || plateBurst.current) return;
    const params = burstParams(sign.id, sign.palette);
    const uniforms = {
      uDissolve: { value: 0 },
      uHubUv: { value: new Vector2(0.5, 0.5) },
      uAspect: { value: 16 / 9 },
      uLifeKey: { value: 0 },
      // Mask numbers (and the seed derivation) come from signBurst — the same
      // ones dissolveMaskDistance is tested with. Never hand-build these.
      ...plateDissolveUniforms(params),
    };
    plateBurst.current = uniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vTysPlateUv;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvTysPlateUv = uv;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          [
            "#include <common>",
            "varying vec2 vTysPlateUv;",
            "uniform float uDissolve;",
            "uniform vec2 uHubUv;",
            "uniform float uSoft;",
            "uniform float uNoise;",
            "uniform float uSeed;",
            "uniform float uRagged;",
            "uniform float uRadius;",
            "uniform float uAspect;",
            "uniform float uLifeKey;",
          ].join("\n"),
        )
        .replace(
          "#include <map_fragment>",
          [
            "#include <map_fragment>",
            "{",
            PLATE_DISSOLVE_GLSL,
            "}",
            "if (uLifeKey > 0.5) {",
            "  float lifeLuma = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));",
            "  diffuseColor.a *= smoothstep(0.02, 0.06, lifeLuma);",
            "}",
          ].join("\n"),
        );
    };
    // Only this material carries the dissolve; keep the program cache honest.
    mat.customProgramCacheKey = () => "tys-plate-dissolve-life";
    mat.needsUpdate = true;
  }, [sign.id, sign.palette]);

  // The painted plate is mostly transparent, so the starfield shows through.
  // The clip is an opaque black frame. Mask it with the still's alpha or the
  // fade covers the stars with a black rectangle.
  useEffect(() => {
    const mat = lifeMat.current;
    if (!mat || !artTex) return;
    const uniforms = {
      uStillMap: { value: artTex as CanvasTexture | null },
      uPoseMap: { value: dwellPoseRt.current?.texture ?? dwellPoseFallbackTexture() },
      uPoseReady: { value: dwellPoseRt.current ? 1 : 0 },
    };
    dwellPoseUniforms.current = uniforms;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uStillMap = uniforms.uStillMap;
      shader.uniforms.uPoseMap = uniforms.uPoseMap;
      shader.uniforms.uPoseReady = uniforms.uPoseReady;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vTysStillUv;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvTysStillUv = uv;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          [
            "#include <common>",
            "varying vec2 vTysStillUv;",
            "uniform sampler2D uStillMap;",
            "uniform sampler2D uPoseMap;",
            "uniform float uPoseReady;",
          ].join("\n"),
        )
        .replace(
          "#include <map_fragment>",
          [
            "#include <map_fragment>",
            "{",
            "  vec4 tysStill = texture2D(uStillMap, vTysStillUv);",
            "  #ifdef USE_MAP",
            "    if (uPoseReady > 0.5) {",
            "      vec4 tysPose = texture2D(uPoseMap, vMapUv);",
            "      diffuseColor.rgb = clamp(tysStill.rgb + (diffuseColor.rgb - tysPose.rgb), 0.0, 1.0);",
            "    }",
            "  #endif",
            "  diffuseColor.a *= tysStill.a;",
            "}",
          ].join("\n"),
        );
    };
    mat.customProgramCacheKey = () => "tys-dwell-motion-delta";
    mat.needsUpdate = true;
  }, [artTex]);

  useFrame(({ clock, camera, gl }, dt) => {
    const g = group.current;
    const mesh = cores.current;
    if (!g || !mesh) return;
    const clearDwellPose = () => {
      const tex = dwellPoseRt.current;
      dwellPoseRt.current = null;
      const uniforms = dwellPoseUniforms.current;
      if (uniforms) {
        uniforms.uPoseReady.value = 0;
        uniforms.uPoseMap.value = dwellPoseFallbackTexture();
      }
      if (!tex) return;
      try {
        tex.dispose();
      } catch {
        /* already detached */
      }
    };
    const releaseLife = () => {
      if (galaxyTravel.dwellClipIndex === index) pauseDwellClip(sign.id);
      dwellBlend.current = 0;
      dwellPhase.current = "idle";
      dwellEnded.current = false;
      dwellHold.current = false;
      dwellRest.current = 0;
      clearDwellPose();
      releaseDwellTexture(lifeMat.current, null, dwellTex);
      if (plateMat.current) plateMat.current.map = artTex;
      if (lifeMat.current) {
        lifeMat.current.opacity = 0;
        lifeMat.current.visible = false;
      }
      if (lifeArt.current) lifeArt.current.visible = false;
      dwellStall.current = 0;
      stopDwellClip(sign.id);
      if (plateBurst.current) plateBurst.current.uLifeKey.value = 0;
    };
    if (volumeGated && !volReady.current && getSignVolume(sign.id)) {
      volReady.current = true;
      bumpVolReady((n) => n + 1);
    }
    const state = frameSession;
    const chatting = state.chatting;
    const shelfSignId = state.shelfSignId;
    const picked = chatting && state.claimSignId === sign.id;
    const held = picked || shelfSignId === sign.id;
    const t = galaxyTravel.t;
    const direct = galaxyTravel.seekDirect && galaxyTravel.seek != null;
    const dest = stationT(index);
    const dist = Math.abs(t - dest);
    const incoming = index === Math.min(11, stationFromT(t) + 1);
    const focused = held || index === aimedIndex() || index === stationFromT(t);
    if (focused || incoming) {
      preloadSignArtNear(index);
      primeSignVolumeNear(index);
    }
    const ready = plateReady(sign.id);
    if (!artTex && (focused || incoming || ready) && !wantArt.current) {
      wantArt.current = true;
      queueMicrotask(() => setArtTex(loadSignArt(sign.id)));
    }
    stationWeight[index] = 0;
    if (introPlaying() && index !== 0 && !held) {
      g.visible = false;
      releaseLife();
      return;
    }
    // A strip / Enter jump shows only where it left and where it lands, never the signs between.
    const departing = direct && index === stationFromT(galaxyTravel.seekStartT ?? t);
    if (direct && !held && index !== aimedIndex() && !departing) {
      g.visible = false;
      releaseLife();
      return;
    }
    const exploringHere =
      galaxyTravel.exploreSignIndex === index && galaxyTravel.explorePhase !== "idle";
    if (exploringSign() && !exploringHere && !held) {
      g.visible = false;
      releaseLife();
      return;
    }
    const sit = TEMPLE_STATIONS[index]!;
    const cam = camera as PerspectiveCamera;
    _sitCam.copy(sit);
    cam.worldToLocal(_sitCam);
    // One plate owns the frame: the nearest sign, handed to the next near the
    // midpoint, and dissolved before the camera can fly into it.
    const depth = -_sitCam.z;
    // Parked eases in rather than snapping: a glide can land while the camera is
    // still catching up, and the plate should not pop to full on that frame.
    const poseSigns = (t - dest) * (TEMPLE_SIGNS.length - 1) + galaxyTravel.portalSigns;
    const parkedTarget =
      galaxyTravel.seek == null && !portalTailing() ? parkedBand(poseSigns) : 0;
    parkedEase.current =
      parkedTarget <= parkedEase.current
        ? parkedTarget
        : lerpToward({ current: parkedEase.current, target: parkedTarget, dt, rate: 3.5 });
    const fade =
      held || exploringHere
        ? 1
        : Math.max(
            plateGeometry(signsPastStation(galaxyTravel.restDist, depth, NAVE), galaxyTravel.restDist, depth) *
              portalEnvelope(index),
            parkedEase.current,
          );
    const show = held || exploringHere || fade > 0.004;
    stationWeight[index] = show ? fade : 0;
    g.visible = show;
    if (!show) {
      mesh.visible = false;
      setCloudDrawRange(starGeo, false);
      releaseLife();
      return;
    }
    const fieldDraw = introField() > 0.02;
    if (hydrated.current && fieldDraw) setCloudDrawRange(starGeo, true);
    else if (!fieldDraw && introPlaying()) setCloudDrawRange(starGeo, false);

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
    const approach = stationCloudApproach(index, t);
    if (!hydrated.current && (focused || incoming || held || ready || approach)) {
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
    const along = smooth(fieldGather(dist));
    const gather = held ? 1 : introPlaying() && index === 0 ? Math.max(0.02, arrive) : along;
    const plateReveal = held
      ? 1
      : introPlaying() && index === 0
        ? Math.max(0, (arrive - 0.12) / 0.62)
        : smooth(Math.max(0, (gather - 0.52) / 0.48));

    const landedHere = exploringHere && insideHardGateHidesLeftovers(galaxyTravel.explorePhase);

    // Ignition dissolve: the painting is eaten outward from its hub. Data-driven —
    // the hub lands in plate UV via the same measured alignment the field uses.
    const pb = plateBurst.current;
    if (pb) {
      const live = exploringHere && galaxyTravel.dissolve > 0.001 ? galaxyTravel.dissolve : 0;
      if (live > 0 && !platePlan.current) platePlan.current = measurePlatePlan(sign.id, volEarly);
      const plan = platePlan.current;
      if (plan) {
        (pb.uHubUv.value as Vector2).set(plan.u, plan.v);
        pb.uAspect.value = plan.aspect;
      }
      pb.uDissolve.value = live;
    }

    if (landedHere) {
      // Inside: the star volume is the room — keep it lit. The painted plate and
      // the 3D shell are the approach shells and go away (the camera is past them).
      releaseLife();
      mesh.visible = true;
      setCloudDrawRange(starGeo, true);
      if (art.current) {
        art.current.visible = false;
        (art.current.material as MeshBasicMaterial).opacity = 0;
      }
      if (exploringHere) galaxyTravel.plateOpacity = 0;
      if (shellWrap.current) shellWrap.current.visible = false;
    } else {
      if (art.current && artTex && !useVolume) {
        const mat = art.current.material as MeshBasicMaterial;
        const plateOn = Boolean(artTex && (artReady(artTex) || ready));
        const bornIn = plateReveal;
        const reducedMotion = prefersReducedMotion();
        const lifeOwns =
          galaxyTravel.dwellClipIndex === index &&
          !galaxyTravel.dwellClipDone &&
          Boolean(dwellClipFor(sign.id));
        const mayPlay = dwellClipMayPlay(index);
        // One stalled paint must not swallow the whole fade. 60fps is unchanged.
        const inStep = Math.min(dt, 1 / 30) / Math.max(0.001, DWELL_CROSSFADE_SEC);
        const winding =
          dwellPhase.current === "out" ||
          (dwellBlend.current > 0 && (!lifeOwns || !mayPlay));

        const finishDwellFade = (markDone: boolean, keepVideo = false) => {
          dwellBlend.current = 0;
          dwellPhase.current = "idle";
          dwellEnded.current = false;
          clearDwellPose();
          releaseDwellTexture(lifeMat.current, null, dwellTex);
          if (lifeMat.current) {
            lifeMat.current.opacity = 0;
            lifeMat.current.visible = false;
          }
          if (lifeArt.current) lifeArt.current.visible = false;
          dwellStall.current = 0;
          dwellHold.current = false;
          dwellRest.current = markDone ? 0.4 : 0;
          if (keepVideo) pauseDwellClip(sign.id);
          else stopDwellClip(sign.id);
        };

        if (dwellRest.current > 0 && !lifeOwns) {
          dwellRest.current = 0;
        } else if (dwellRest.current > 0 && lifeOwns && mayPlay) {
          dwellRest.current = Math.max(0, dwellRest.current - dt);
          if (dwellRest.current <= 0) galaxyTravel.dwellClipDone = true;
        } else if (dwellRest.current > 0 && lifeOwns) {
          dwellRest.current = 0;
          galaxyTravel.dwellClipDone = true;
        } else if (lifeOwns && mayPlay && !reducedMotion && dwellPhase.current !== "out") {
          const video = primeDwellClip(sign.id);
          if (dwellPhase.current === "idle" || dwellPhase.current === "wait") {
            if (!video) {
              dwellPhase.current = "wait";
              dwellStall.current += dt;
            } else if (video.error) {
              dwellPhase.current = "wait";
              dwellStall.current += dt;
            } else if (video.ended) {
              finishDwellFade(true);
            } else if (video && !video.error && !video.ended) {
              const poseHeld =
                !dwellHold.current && video.paused && video.currentTime < 0.05;
              if (!dwellVideoFrameReady(video)) {
                // Decode frame 0 offscreen and park it. The fade starts on that
                // pose; playback begins with the fade, not on an empty frame.
                if (!dwellHold.current) {
                  dwellHold.current = true;
                  void video
                    .play()
                    .then(() => {
                      if (dwellPhase.current !== "wait") return;
                      video.pause();
                      if (video.currentTime > 0.04) video.currentTime = 0;
                    })
                    .catch(() => {})
                    .finally(() => {
                      dwellHold.current = false;
                    });
                }
                dwellPhase.current = "wait";
                dwellStall.current += dt;
              } else if (!poseHeld) {
                if (!dwellHold.current) {
                  video.pause();
                  if (video.currentTime > 0.04) video.currentTime = 0;
                }
                dwellPhase.current = "wait";
                dwellStall.current += dt;
              } else {
                const uniforms = dwellPoseUniforms.current;
                const videoTex = bindDwellTexture(video, dwellTex.current, aspect, sign.id);
                dwellTex.current = videoTex;
                const poseTex = uniforms ? renderDwellPose(gl, videoTex, dwellPoseRt) : null;
                if (!uniforms || !poseTex) {
                  dwellPhase.current = "wait";
                  dwellStall.current += dt;
                } else {
                  uniforms.uPoseMap.value = poseTex;
                  uniforms.uPoseReady.value = 1;
                  if (lifeMat.current) {
                    if (lifeMat.current.map !== videoTex) {
                      lifeMat.current.map = videoTex;
                      lifeMat.current.needsUpdate = true;
                    }
                    lifeMat.current.visible = true;
                  }
                  dwellStall.current = 0;
                  dwellHold.current = false;
                  dwellPhase.current = "in";
                  // Motion starts inside the fade. A held pose that then plays
                  // is a frame you can point at.
                  if (video.paused && !video.ended) void video.play().catch(() => {});
                }
              }
            }
          }
          const stalled = dwellPhase.current === "wait" && dwellStall.current > DWELL_START_GIVE_UP_SEC;
          if (stalled || video?.error) {
            finishDwellFade(true);
          } else if (dwellPhase.current === "in") {
            if (video && video.paused && !video.ended) void video.play().catch(() => {});
            dwellBlend.current = Math.min(1, dwellBlend.current + inStep);
            // Keep the visible pose on the fade. A long paint otherwise
            // reveals a frame that already moved while the blend was stuck.
            if (video && !video.ended) {
              const target = dwellBlend.current * DWELL_CROSSFADE_SEC;
              if (video.currentTime > target + 0.05) video.currentTime = target;
            }
            if (dwellBlend.current >= 1) dwellPhase.current = "play";
          } else if (dwellPhase.current === "play") {
            dwellBlend.current = 1;
            if (video && video.paused && !video.ended && !dwellEnded.current) {
              void video.play().catch(() => {});
            }
            const dur = video && Number.isFinite(video.duration) ? video.duration : 0;
            const remain = video ? dur - video.currentTime : 99;
            // Hold the pose the clip settles on, then fade. Fading across the
            // last 200ms of the file lets one long paint swallow the return.
            const poseBack =
              !!video && video.currentTime > 0.4 && dur > 1 && remain <= 0.05;
            if (poseBack || video?.ended) {
              if (video && !video.ended) video.pause();
              dwellEnded.current = true;
              dwellPhase.current = "out";
            }
          }
        } else if (winding) {
          if (galaxyTravel.paused || dwellEnded.current) pauseDwellClip(sign.id);
          if (dwellPhase.current !== "out") dwellPhase.current = "out";
          // A swipe or a stalled paint must not swallow the fade.
          const outStep = inStep;
          dwellBlend.current = Math.max(0, dwellBlend.current - outStep);
          if (dwellBlend.current <= 0) {
            finishDwellFade(dwellEnded.current, galaxyTravel.paused && lifeOwns);
          }
        } else if (dwellPhase.current !== "idle" || dwellBlend.current > 0) {
          finishDwellFade(false);
        }

        const ariesBreath =
          index === 0 && !reducedMotion
            ? 1 + Math.sin(galaxyTravel.shaderTime * 0.72) * 0.012
            : 1;
        // Corridor plates follow the one-owner weight alone (no floor, so no stack).
        // BirthChat, the enter dive, and the intro keep the tested helper.
        const corridorPlate = !held && !exploringHere && !(introPlaying() && index === 0);
        const plateOp = corridorPlate
          ? plateOn
            ? fade
            : 0
          : computePlateOpacity({
              plateOn,
              held,
              focused,
              fade,
              bornIn,
              morphLevel: morphLevel.current,
            }) * (exploringHere ? galaxyTravel.plateFade : 1);
        const plane = { x: wide, y: wide / aspect };
        art.current.visible = plateOp > 0.04;
        art.current.scale.set(plane.x * ariesBreath, plane.y * ariesBreath, 1);
        const stillMul =
          index === 0 && !reducedMotion
            ? 0.985 + Math.sin(galaxyTravel.shaderTime * 0.9 + 0.6) * 0.015
            : 1;
        // The still stays under the clip the whole time. Dropping it when the
        // blend hits 1 lets the sky through the strokes, which is the hitch
        // at both cuts. Life opacity alone does the fade.
        mat.opacity = plateOp * stillMul;
        mat.map = artTex;
        if (lifeArt.current && lifeMat.current) {
          const lifeOp = plateOp * dwellBlend.current * stillMul;
          const showLife = lifeOp > 0.004;
          lifeArt.current.visible = showLife;
          lifeArt.current.scale.set(plane.x * ariesBreath, plane.y * ariesBreath, 1);
          const clipVideo = primeDwellClip(sign.id);
          if (clipVideo && dwellVideoFrameReady(clipVideo) && dwellBlend.current > 0.001) {
            dwellTex.current = bindDwellTexture(clipVideo, dwellTex.current, aspect, sign.id);
            if (dwellTex.current) {
              if (lifeMat.current.map !== dwellTex.current) {
                lifeMat.current.map = dwellTex.current;
                lifeMat.current.needsUpdate = true;
              }
              fitDwellCoverUv(dwellTex.current, clipVideo, aspect, sign.id);
              // Playback presents frames through requestVideoFrameCallback.
              // A held pose does not, so the paused frame never reaches the GPU
              // unless we ask for the upload ourselves.
              if (clipVideo.paused || dwellPhase.current === "in") dwellTex.current.needsUpdate = true;
            }
          }
          lifeMat.current.opacity = lifeOp;
          // releaseLife sets material.visible false, and Three skips the draw
          // even when the mesh is visible. Leo is hidden during the intro, so
          // without this the still holds and then pops off when the blend hits 1.
          lifeMat.current.visible = showLife;
          lifeMat.current.depthTest = false;
          lifeMat.current.alphaTest = 0.04;
        }
        // Measured evidence for M11: what the entered sign's plate is actually
        // drawn at. Only the entered station publishes, so a neighbour's frame
        // can't clobber the value the QA probe reads.
        if (exploringHere) galaxyTravel.plateOpacity = plateOp;
        if (plateBurst.current) plateBurst.current.uLifeKey.value = 0;
        mat.depthTest = false;
        mat.alphaTest = 0.04;
        if (plateOn && !shown.current) {
          artTex.needsUpdate = true;
          mat.needsUpdate = true;
          shown.current = true;
        }
      }
      if (shellWrap.current) {
        const shellOp = exploringHere ? galaxyTravel.plateFade : 1;
        shellWrap.current.visible = shellOp > 0.04;
        if (shellWrap.current.visible) {
          for (const mat of shellMats.current) {
            mat.transparent = true;
            mat.opacity = 0.94 * shellOp;
          }
        }
      }

      if (!held && !exploringHere && fade < 0.01) {
        mesh.visible = false;
        return;
      }
      if (introPlaying() && index === 0 && introAries() < 0.1) {
        mesh.visible = false;
        setCloudDrawRange(starGeo, false);
        return;
      }
      if (introPlaying() && !fieldDraw) {
        mesh.visible = false;
        setCloudDrawRange(starGeo, false);
        return;
      }
      mesh.visible = true;
      if (hydrated.current) setCloudDrawRange(starGeo, true);
      const morphTarget = picked ? 1 : 0;
      // Faster in (star formation feels snappy), slower out (dissolve back gracefully)
      const morphRate = prefersReducedMotion() ? 20 : picked ? 1.8 : 1.2;
      morphLevel.current += (morphTarget - morphLevel.current) * Math.min(1, dt * morphRate);
      const ml = morphLevel.current;
      const u = coreMat.uniforms;
      const landGain =
        index === aimedIndex() && !exploringHere ? cloudBurstGain(signArrive.burst) : CLOUD_GAIN_IDLE;
      u.uTime.value = galaxyTravel.shaderTime;
      u.uGather.value = gather;
      u.uWide.value = wide;
      u.uTall.value = wide / aspect;
      u.uMorph.value = ml;
      // Group slide handles X positioning; per-star bias causes double-shift
      u.uGlyphBiasX.value = 0;
      // Swirl dampens as morph settles; halo/spiral fade so glyph reads clean
      u.uSwirl.value = (prefersReducedMotion() ? 0 : 1 - ml * 0.9) * landGain.swirl;
      u.uFade.value = fade;
      u.uHover.value = (galaxyTravel.ptrOn && focused ? 1.12 : 1) * landGain.hover;
      u.uPxScale.value = STAR_PROFILE.stationPixelScale;
      u.uBaseSize.value = STAR_PROFILE.stationBaseSize;
      // Boost opacity when forming glyph so stars are crisp and visible
      const formBoost = exploringHere ? 0.35 + galaxyTravel.galaxyForm * 0.85 : 1;
      u.uOpacity.value = (0.62 + fade * 0.32) * (1 + ml * 0.55) * formBoost * landGain.opacity;
      // Dissolving plate: keep animal gather high; swirl eases as galaxy forms.
      if (exploringHere) {
        u.uGather.value = Math.max(gather, 0.72 + galaxyTravel.galaxyForm * 0.28);
        u.uSwirl.value = prefersReducedMotion()
          ? 0
          : Math.max(0, (1 - ml * 0.9) * (1 - galaxyTravel.galaxyForm * 0.85));
        u.uMorph.value = ml * (1 - galaxyTravel.galaxyForm);
      }
      // Halo aliveness snaps off the instant steering/held/exploring
      // starts (the one-plate rule's damping applies here too), and eases
      // back up over ~1s once the camera is settled again.
      const lifeTarget =
        !held &&
        !exploringHere &&
        !prefersReducedMotion() &&
        !galaxyTravel.paused &&
        cameraSettledOn(index)
          ? 1
          : 0;
      lifeEase.current =
        lifeTarget <= lifeEase.current
          ? lifeTarget
          : lerpToward({ current: lifeEase.current, target: lifeTarget, dt, rate: 1.4 });
      u.uLife.value = lifeEase.current;
      // Pointer position drives the halo's depth parallax (see starRender);
      // life above already damps it while the camera is moving.
      u.uParX.value = galaxyTravel.ptrX;
      u.uParY.value = galaxyTravel.ptrY;
      // Fire/earth/air/water — see starRender's element-motion branch.
      u.uElement.value = ELEMENT_CODE[sign.element];
      (u.uTint.value as Color).copy(tint);
    }

    if (landedHere) {
      // Settled interior light: you are inside the galaxy, surrounded by its
      // stars — not looking at a switched-off set. Gentle drift, no swirl.
      const u = coreMat.uniforms;
      u.uOpacity.value = 0.66;
      u.uFade.value = 1;
      u.uGather.value = 1;
      u.uSwirl.value = prefersReducedMotion() ? 0 : 0.16;
      u.uMorph.value = 0;
      u.uTime.value = clock.elapsedTime;
      u.uHover.value = 1;
      // Inside the sign, the corridor-only halo life effects stay off.
      u.uLife.value = 0;
      lifeEase.current = 0;
    }
  });

  const stationName = `${galaxyLayerName("station-cloud")}-${sign.id}`;
  return (
    <group ref={group} frustumCulled={false} name={stationName}>
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
          ref={plateMat}
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
      <mesh
        ref={lifeArt}
        position={[0, 0.05, -0.06]}
        visible={false}
        renderOrder={19}
        frustumCulled={false}
        raycast={noopRaycast}
        dispose={null}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={lifeMat}
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
        <group ref={shellWrap} position={[0, 0.05, -0.06]}>
          <Suspense fallback={null}>
            <SignShell signId={sign.id} plateWide={PLATE_WIDE} />
          </Suspense>
        </group>
      ) : null}
      <points
        ref={cores}
        key={stationName}
        name={stationName}
        geometry={starGeo}
        material={coreMat}
        frustumCulled={false}
        raycast={noopRaycast}
      />
      <SignGalaxyField sign={sign} index={index} />
      {index === 0 ? <AriesAtmosphere /> : null}
      <BigThreeLights signId={sign.id} />
    </group>
  );
}

function AriesAtmosphere() {
  const halo = useRef<Mesh>(null);
  const orbit = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);

  useFrame(() => {
    const t = galaxyTravel.shaderTime;
    const breathe = 1 + Math.sin(t * 0.72) * 0.025;
    const hover = galaxyTravel.ptrOn ? 1 : 0;
    // The rings belong to the Aries plate: they leave the frame with it.
    const own = stationWeight[0] ?? 1;
    const shimmer = 0.5 + 0.5 * Math.sin(t * 1.15 + 0.8) + hover * 0.18;

    if (halo.current) {
      halo.current.scale.set(
        (1.02 + hover * 0.018) * breathe,
        (0.58 + hover * 0.012) * breathe,
        1,
      );
      halo.current.rotation.z = t * 0.035;
      const material = halo.current.material as MeshBasicMaterial;
      material.opacity = (0.035 + shimmer * 0.018) * own;
    }
    if (orbit.current) {
      orbit.current.scale.set(
        (1.02 + hover * 0.025) * breathe,
        (0.58 + hover * 0.018) * breathe,
        1,
      );
      orbit.current.rotation.z = -t * 0.055;
      const material = orbit.current.material as MeshBasicMaterial;
      material.opacity = (0.14 + shimmer * 0.06) * own;
    }
    if (core.current) {
      const material = core.current.material as MeshBasicMaterial;
      material.opacity = (0.025 + shimmer * 0.018) * own;
    }
  });

  return (
    <group position={[0, 0.05, -0.12]} renderOrder={14} raycast={noopRaycast}>
      <mesh ref={core} renderOrder={13}>
        <circleGeometry args={[5.1, 96]} />
        <meshBasicMaterial
          color="#c9a15b"
          transparent
          opacity={0.03}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={halo} renderOrder={14}>
        <ringGeometry args={[5.08, 5.13, 128]} />
        <meshBasicMaterial
          color="#c9a15b"
          transparent
          opacity={0.04}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={orbit} renderOrder={15} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[5.34, 5.365, 128]} />
        <meshBasicMaterial
          color="#f0d4a1"
          transparent
          opacity={0.16}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
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
  /** The t this rig last published, to tell its own writes from an outside placement. */
  const written = useRef(galaxyTravel.t);
  const warpSeen = useRef(galaxyTravel.warpSeq);
  const lastVirtualT = useRef(galaxyTravel.t);
  const fogReady = useRef(false);
  const lastStation = useRef(0);
  const epoch = useRef(galaxyTravel.epoch);
  const lastPub = useRef(-1);
  const booted = useRef(false);
  const diveAmount = useRef(0);

  useEffect(() => {
    ensureAutoClock();
    ensureFlyInput();
    return () => stopAutoClock();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useSessionStore.getState();
      if (state.claim) return;
      if (state.session) return;
      if (introPlaying()) {
        // Tab must move focus — only Escape / Enter / Space skip the intro.
        if (introCanSkip() && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          skipIntro();
          galaxyTravel.birth = 1;
          useGalaxy.getState().markBorn();
        }
        return;
      }
      if (enterAnimating()) {
        if (e.key === "Escape" || e.key === "Enter") {
          skipEnterGalaxy();
          noteControl();
        }
        return;
      }
      // Keys typed into a form field belong to that field, not to the sky.
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        t.closest("input, textarea, select, [contenteditable=true]")
      ) {
        return;
      }
      // While exploring one sign's galaxy, Escape is the way out.
      if (exploringSign()) {
        if (e.key === "Escape") {
          exitSignGalaxy();
          noteControl();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S" || e.key === "ArrowRight") {
        stepSign(1);
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === "ArrowLeft") {
        stepSign(-1);
      } else if (e.key === "Enter" && galaxyTravel.birth < 1) {
        skipBirth();
        useGalaxy.getState().markBorn();
      } else if (e.key === "Enter" && galaxyTravel.birth >= 1 && !introPlaying()) {
        enterSignGalaxy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((_, delta) => {
    syncFrameSession();
    const d = Math.min(0.05, Math.max(0.001, delta));
    let snapPose = false;
    if (epoch.current !== galaxyTravel.epoch) {
      epoch.current = galaxyTravel.epoch;
      current.current = galaxyTravel.t;
      galaxyTravel.tTarget = galaxyTravel.t;
      booted.current = false;
    } else if (galaxyTravel.t !== written.current) {
      // Someone placed the camera (refresh restore, deep link): take it as a cut,
      // not a capped crawl across the corridor.
      current.current = galaxyTravel.t;
      snapPose = true;
    }
    const t0 = current.current;
    // I5: one shared sky clock — a pause freezes every shader below together.
    stepShaderTime(d);
    if (stepBirth(d)) {
      useGalaxy.getState().markBorn();
      galaxyTravel.awaken = 1;
    } else if (galaxyTravel.birth >= 1) {
      useGalaxy.getState().markBorn();
      if (galaxyTravel.awaken < 0.2) galaxyTravel.awaken = 1;
    }
    stepIntro(d);
    stepExplore(d);
    const state = useSessionStore.getState();
    const chatting = state.claim !== null && state.session === null;
    const arriving = introPlaying();
    const exploring = exploringSign();
    // Keep busy in sync so selection hold pauses during claim / intro.
    galaxyTravel.busy = chatting || state.session !== null || arriving;
    galaxyTravel.claiming = chatting;
    const sought = exploring ? { active: false, t: current.current } : stepSeek(current.current, d);
    // A seek landing this frame (or a reduced-motion cut) places t exactly.
    if (sought.active || sought.t !== current.current) {
      current.current = sought.t;
      galaxyTravel.tTarget = sought.t;
    }
    const free = !chatting && !arriving && !sought.active && !exploring;
    if (chatting) {
      const i = CONSTELLATIONS.findIndex((c) => c.id === state.claim?.signId);
      if (i >= 0) galaxyTravel.tTarget = stationT(i);
    } else if (free) {
      stepCorridorFlight(current.current, d);
    }
    galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget);
    const k = arriving ? 1 : 1 - Math.exp(-d * (sought.active ? 2.6 : 2.9));
    let step = (galaxyTravel.tTarget - current.current) * (arriving ? 1 : k);
    if (free && galaxyTravel.seek != null) {
      // Hands just came off: the landing takes its first eased step now, so the motion never stalls.
      const first = stepSeek(current.current, d);
      galaxyTravel.tTarget = first.t;
      step = first.t - current.current;
    } else if (free) {
      step = capFlightStep(step, d);
    }
    current.current = clamp01(current.current + step);
    const t = current.current;
    // Speed along the virtual path (t plus any portal offset), with a portal cut's
    // jump taken out, so a portal reads as the one-sign glide it looks like.
    if (prefersReducedMotion() && Math.abs(t - t0) > 0.02) snapPose = true;
    const warped = galaxyTravel.warpSeq !== warpSeen.current;
    const vt = t + galaxyTravel.portalSigns / (TEMPLE_SIGNS.length - 1);
    let dv = snapPose || !booted.current ? 0 : vt - lastVirtualT.current;
    if (warped) dv -= galaxyTravel.warpT;
    lastVirtualT.current = vt;
    galaxyTravel.vel = dv / d;
    galaxyTravel.traveling =
      sought.active ||
      Math.abs(galaxyTravel.tTarget - t) > SETTLE_DIST ||
      Math.abs(galaxyTravel.vel) > SETTLED_VEL;
    TEMPLE_CURVE.getPointAt(t, _chest);
    const aspect = viewAspect(size);
    const idx = stationFromT(t);
    const exploreIdx = galaxyTravel.exploreSignIndex ?? idx;
    stepZoom(d, idx !== lastStation.current && !exploring);
    lastStation.current = idx;
    const vol = getSignVolume(TEMPLE_SIGNS[exploreIdx]!.id);
    const plateA = vol?.aspect ?? 16 / 9;
    const shelfOn = state.session?.kind === "shelf";
    const well = chatting || shelfOn ? { top: 0.12, bottom: 0.48 } : { top: 0.15, bottom: 0.24 };
    const frame = heroFrame(aspect, arriving ? introCam() : 1, plateA, PLATE_WIDE, well);
    // Inside: allow pull-back below 1 so the silhouette stays readable; corridor floors at 1.
    const zoom = arriving
      ? 1
      : exploring
        ? Math.min(EXPLORE_ZOOM_MAX, Math.max(EXPLORE_ZOOM_MIN, galaxyTravel.zoom))
        : Math.max(1, galaxyTravel.zoom);
    const pull = 1 - introCam();
    _cam.copy(_chest);
    _cam.z += frame.z / zoom;
    galaxyTravel.restDist = frame.z / zoom;
    _cam.y += frame.y / (0.72 + zoom * 0.28) + pull * 0.35;
    _look.copy(_chest);
    _look.z -= 1.4 + introCam() * 1.0;
    _look.y += frame.portrait ? 0.05 : 0.15;
    if (galaxyTravel.portalSigns !== 0) {
      // Portal glide: the camera travels off its station along the corridor (+ = forward, −z).
      const off = galaxyTravel.portalSigns * NAVE;
      _cam.z -= off;
      _look.z -= off;
    }
    if (!arriving) {
      // The pointer sway belongs to the corridor aim, so a sign exit can blend into
      // it continuously (below) instead of snapping it on in one frame.
      _look.x += galaxyTravel.ptrX * 1.1;
      _look.y += -galaxyTravel.ptrY * 0.6;
    }
    if (!arriving && !exploring) {
      _cam.x += galaxyTravel.ptrX * 0.35;
      _cam.y += galaxyTravel.ptrY * 0.2;
    }
    const corridorLookX = _look.x;
    const corridorLookY = _look.y;
    const corridorLookZ = _look.z;
    // Local dive: BirthChat volume hold, or selected-sign galaxy enter.
    const heldSignId = chatting ? state.claim?.signId : shelfOn ? state.session?.signId : undefined;
    const volumeDive = heldSignId && hasVolumeSign(heldSignId) ? 0.35 * PLATE_WIDE : 0;
    let exploreDive = 0;
    if (exploring && galaxyTravel.exploreSignIndex != null) {
      // Close the measured gap to the hub star instead of a fixed distance: the
      // landing then frames the core the same way on any aspect, and the hub can
      // never end up behind the lens (which is what left the room dark).
      const hubGalaxy = getSignGalaxy(TEMPLE_SIGNS[galaxyTravel.exploreSignIndex]!.id);
      const hubLocal = pointLocalOffset(hubGalaxy, 0, galaxyTravel.galaxyForm);
      _hub.copy(TEMPLE_STATIONS[galaxyTravel.exploreSignIndex]!);
      _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      _hub.addScaledVector(_camRight, hubLocal.x);
      _hub.addScaledVector(_camUp, hubLocal.y);
      _hub.z += hubLocal.z + 0.35;
      const gap = Math.max(1.2, _cam.distanceTo(_hub) - HUB_STANDOFF);
      // Hold first (the figure is the subject), then the rush does the flying.
      exploreDive = gap * (0.55 * galaxyTravel.diveBlend + 0.45 * galaxyTravel.enterRush);
    }
    const diveTarget = Math.max(volumeDive, exploreDive);
    const snapSkipPose = galaxyTravel.enterSkip === "hold" || galaxyTravel.skipVeil > 0.5;
    // During sign-enter (not BirthChat volume-only), track the curve tightly.
    const diveRate =
      exploring && galaxyTravel.exploreSignIndex != null
        ? galaxyTravel.explorePhase === "inside"
          ? 3.2
          : 6.5
        : 2.2;
    diveAmount.current = snapSkipPose
      ? diveTarget
      : lerpToward({
          current: diveAmount.current,
          target: diveTarget,
          dt: d,
          rate: diveRate,
        });
    if (diveAmount.current > 0.0005) _cam.z -= diveAmount.current;

    if (exploring && galaxyTravel.exploreSignIndex != null) {
      const sit = TEMPLE_STATIONS[galaxyTravel.exploreSignIndex]!;
      const gxy = getSignGalaxy(TEMPLE_SIGNS[galaxyTravel.exploreSignIndex]!.id);
      const form = galaxyTravel.galaxyForm;
      const dive = galaxyTravel.diveBlend;
      // Enter aims at the hub portal; inside and exit keep the active travel node
      // so leaving a deep node doesn't snap the look back to hub.
      const entering =
        galaxyTravel.explorePhase === "fading" || galaxyTravel.explorePhase === "diving";
      const pi = entering
        ? 0
        : galaxyTravel.pointSeek != null
          ? galaxyTravel.pointT
          : galaxyTravel.pointIndex;
      const local = pointLocalOffset(gxy, Math.round(pi), Math.max(form, dive * 0.85));
      // Billboard station: offset along camera right/up, then into look.
      _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      _look.copy(sit);
      _look.addScaledVector(_camRight, local.x);
      _look.addScaledVector(_camUp, local.y);
      _look.z += local.z * 0.12;
      if (galaxyTravel.explorePhase === "exiting") {
        // Hand the aim back to the corridor continuously. The exit eases the dive to
        // zero, so the aim has to arrive on the corridor pose by the frame the phase
        // reaches idle — switching branches cold snapped the lookAt (measured: 2.7
        // units of target travel in a single frame, against a 0.01 idle baseline).
        const s = 1 - Math.min(1, Math.max(0, galaxyTravel.exploreProgress));
        const w = s * s * (3 - 2 * s);
        _look.x += (corridorLookX - _look.x) * w;
        _look.y += (corridorLookY - _look.y) * w;
        _look.z += (corridorLookZ - _look.z) * w;
      }
      const settle =
        galaxyTravel.explorePhase === "inside"
          ? 1
          : Math.max(enterHubSettle(galaxyTravel.exploreProgress), dive);
      if (galaxyTravel.explorePhase !== "inside" && settle > 0.001) {
        // Ease toward the hub star on the figure while the plate is still filling the frame.
        const pull = 0.025 + settle * 0.1;
        _cam.x += (_look.x - _cam.x) * pull;
        _cam.y += (_look.y - _cam.y) * (pull * 0.85);
      }
      if (galaxyTravel.explorePhase === "inside") {
        // Park explicitly at the hub star: fixed standoff, framed a touch above
        // centre. Convergence alone left a per-sign residual — the hero-frame lift
        // fights the pull — which is why the landing drifted sign to sign. Setting
        // the pose directly makes every sign and viewport land the same way.
        const fovNow = camera instanceof PerspectiveCamera ? camera.fov : 50;
        // Drop the *aim* below the hub: aiming at the hub centres it exactly, which
        // is why a camera-height bias alone did nothing measurable (hubNdcY stayed
        // 0.000 at every viewport). Aiming low frames the core above centre, and the
        // amount is a pure function of viewport height, so nothing can drift per sign.
        const lift = landingBiasNdc(cssViewHeight()) * HUB_STANDOFF * Math.tan((fovNow * Math.PI) / 360);
        _look.set(_hub.x, _hub.y - lift, _hub.z);
        _cam.set(_hub.x, _hub.y, _hub.z + HUB_STANDOFF);
        {
          const lx = galaxyTravel.exploreLookX;
          const ly = galaxyTravel.exploreLookY;
          if (lx !== 0 || ly !== 0) {
            // Stable parked-hub screen axes — NOT camera.quaternion. The live
            // quat already includes last frame's lookAt, so re-applying the same
            // offsets in that basis oscillates hard at the clamp extremes.
            offsetExploreLookPose(_cam, _look, lx, ly);
          }
          // Mouse hover peek only — touch must not sway until a real drag
          // (ptrOn stays false for fingers; see pointerTracksHover).
          if (!galaxyTravel.dragging && galaxyTravel.ptrOn) {
            _look.x += galaxyTravel.ptrX * 0.35;
            _look.y += -galaxyTravel.ptrY * 0.2;
            _cam.x += galaxyTravel.ptrX * 0.12;
            _cam.y += galaxyTravel.ptrY * 0.08;
          }
        }
      }
    }

    if (!Number.isFinite(_cam.x) || !Number.isFinite(_look.x)) return;
    if (warped) {
      // Portal cut: the scene swaps stations under the camera. Shift the lagging
      // camera by the same amount so its speed and trail carry straight through.
      warpSeen.current = galaxyTravel.warpSeq;
      camera.position.x += galaxyTravel.warp.x;
      camera.position.y += galaxyTravel.warp.y;
      camera.position.z += galaxyTravel.warp.z;
    }
    camera.up.copy(_up);
    if (!booted.current || arriving || snapSkipPose || snapPose) {
      camera.position.copy(_cam);
      camera.lookAt(_look);
      booted.current = true;
    } else if (galaxyTravel.explorePhase === "inside") {
      // Inside pose is already an absolute park + look offset. Soft-lerping
      // position while lookAt snaps left cam and aim disagreeing every frame,
      // which amplified the old quaternion-basis jitter.
      camera.position.copy(_cam);
      camera.lookAt(_look);
    } else {
      const ease = exploring ? 1 - Math.exp(-d * 1.6) : k;
      camera.position.lerp(_cam, ease);
      camera.lookAt(_look);
    }
    if (portalActive()) {
      // Where the camera itself has reached on the portal (it trails the pose); the cut waits for it.
      const lag = (galaxyTravel.portalDir * (camera.position.z - _cam.z)) / NAVE;
      galaxyTravel.portalCamV = galaxyTravel.portalV - lag;
      galaxyTravel.portalCamFed = true;
    } else if (portalTailing()) {
      // Pose landed; follow the camera home so the arriving plate's fade stays on it.
      const lag = (galaxyTravel.portalTailDir * (camera.position.z - _cam.z)) / NAVE;
      galaxyTravel.portalCamV = Math.max(galaxyTravel.portalCamV, 1 - lag);
      if (galaxyTravel.portalCamV >= 0.99 || exploring) galaxyTravel.portalTailTo = null;
    }
    // The seam-clearance roll lives on the *figure* (SignGalaxyField), not here:
    // the station is billboarded to the camera, so rolling the camera would carry
    // the billboard with it and change nothing on screen.
    if (import.meta.env.DEV && exploring && galaxyTravel.exploreSignIndex != null) {
      // Dev-only QA probe — lets scripts/qa/enter-capture.mjs measure the dive
      // (camera → hub distance, framing) instead of eyeballing it.
      _hubNdc.copy(_hub).project(camera);
      (window as unknown as { __tys?: unknown }).__tys = {
        p: +galaxyTravel.exploreProgress.toFixed(4),
        phase: galaxyTravel.explorePhase,
        camZ: +camera.position.z.toFixed(3),
        hubZ: +_hub.z.toFixed(3),
        camToHub: +camera.position.distanceTo(_hub).toFixed(3),
        hubNdcX: +_hubNdc.x.toFixed(3),
        hubNdcY: +_hubNdc.y.toFixed(3),
        dive: +diveAmount.current.toFixed(3),
        fov: camera instanceof PerspectiveCamera ? +camera.fov.toFixed(2) : null,
      };
    }
    if (camera instanceof PerspectiveCamera) {
      camera.far = 2500;
      const fovWant = chatting
        ? Math.min(52, frame.fov)
        : arriving
          ? frame.fov - (1 - introCam()) * 4
          : exploring
            ? frame.fov / (0.94 + galaxyTravel.galaxyForm * 0.18)
            : frame.fov / (0.92 + (zoom - 1) * 0.18);
      if (arriving || Math.abs(camera.fov - fovWant) > 3) camera.fov = fovWant;
      else camera.fov += (fovWant - camera.fov) * k;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    if (scene.fog instanceof FogExp2) {
      // Eased over time, so a portal cut (or a fast pass) never flips the sky's tint in a frame.
      lerpFog(t, _fogGoal);
      if (fogReady.current) _fog.lerp(_fogGoal, 1 - Math.exp(-d * 3));
      else _fog.copy(_fogGoal);
      fogReady.current = true;
      const fogMul = exploring ? 0.55 + galaxyTravel.worldFade * 0.45 : 1;
      scene.fog.color.copy(_fog).multiplyScalar(fogMul);
      _bg.copy(_fog).multiplyScalar(0.35 * fogMul);
      scene.background = _bg;
      if (exploring) {
        scene.fog.density = 0.01 * (0.35 + galaxyTravel.worldFade * 0.65);
      } else {
        scene.fog.density = 0.01;
      }
    }
    // The Aries life clip cannot play during the ask (dwellClipMayPlay refuses
    // while the intro is running). Hold the ~1MB fetch until the veil lifts so
    // it does not compete with first paint. Priming still starts during the
    // gather, with the full intro left to buffer, so the clip is not marked
    // done just because the element does not exist yet.
    const holdClipForAsk = introPlaying() && templeIntro.asking;
    syncDwellPrefetch(
      prefersReducedMotion() || exploringSign() || holdClipForAsk
        ? null
        : (TEMPLE_SIGNS[aimedIndex()]?.id ?? null),
    );
    galaxyTravel.t = t;
    written.current = t;
    if (galaxyTravel.moved) galaxyTravel.awaken = 1;
    stepSelectionHold();
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
