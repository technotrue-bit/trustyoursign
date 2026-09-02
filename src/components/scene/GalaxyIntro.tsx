import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Vector3,
} from "three";
import { CONSTELLATIONS, constellationDust, pairFigures, type Constellation } from "@/lib/galaxy/constellations";
import { artAspect, artReady, hydrateSignArt, loadSignArt, preloadSignArt } from "@/lib/galaxy/signArt";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  CRUISE,
  HOLD_FLY,
  MAX_FLY,
  PLAY_CRUISE,
  SPACING,
  alongToGate,
  aimedIndex,
  birthBoom,
  birthIgnite,
  galaxyTravel,
  gateForm,
  morphBurst,
  nearestSign,
  prefersReducedMotion,
  signedDelta,
  signMorph,
  SEEK_ARRIVE,
  skipBirth,
  starGather,
  starSpark,
  stepBirth,
  stepPlayUntil,
  stepSeek,
} from "@/lib/galaxy/travel";
import { canvasDpr, glContextAttrs, isSmallGpu } from "@/lib/gpu";
import { useVault } from "@/lib/store";

const COUNT = 12;
const SMALL = typeof window !== "undefined" && isSmallGpu();
const STAR_N = SMALL ? 2800 : 6400;
const GALAXY_TINT: Record<string, string> = {
  fire: "#f3d5b0",
  earth: "#e6d7b8",
  air: "#dce6ef",
  water: "#cfd8ea",
};

const _look = new Vector3();
const _pos = new Vector3();

function pathAt(t: number, out: Vector3) {
  out.set(Math.sin(t * 0.17) * 1.6, Math.cos(t * 0.11) * 0.85, -t * SPACING);
}

function makeSparkTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,248,236,1)");
  g.addColorStop(0.18, "rgba(255,236,210,0.9)");
  g.addColorStop(0.42, "rgba(255,220,180,0.28)");
  g.addColorStop(1, "rgba(255,220,180,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function scatterStar(pos: BufferAttribute, i: number, z: number, tight: boolean) {
  const spreadX = tight ? 16 : 38;
  const spreadY = tight ? 9 : 22;
  pos.setXYZ(
    i,
    (Math.random() - 0.5) * spreadX,
    (Math.random() - 0.5) * spreadY * (Math.random() < 0.55 ? 0.5 : 1),
    z,
  );
}

function StarField() {
  const points = useRef<Points>(null);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(STAR_N * 3);
    const attr = new BufferAttribute(pos, 3);
    for (let i = 0; i < STAR_N; i++) scatterStar(attr, i, -Math.random() * 140, i % 5 !== 0);
    g.setAttribute("position", attr);
    return g;
  }, []);
  const spark = useMemo(() => makeSparkTexture(), []);
  useEffect(() => () => { geo.dispose(); spark.dispose(); }, [geo, spark]);
  useFrame(({ camera }) => {
    const mesh = points.current;
    if (!mesh) return;
    const mat = mesh.material;
    const b = galaxyTravel.birth;
    if (mat && !Array.isArray(mat) && "opacity" in mat) mat.opacity = 0.28 + b * 0.62;
    const pos = mesh.geometry.getAttribute("position") as BufferAttribute;
    const cz = camera.position.z;
    if (!Number.isFinite(cz)) return;
    const far = cz - 120;
    const near = cz + 8;
    for (let i = 0; i < STAR_N; i++) {
      let z = pos.getZ(i);
      if (z > near) z = cz - 118 - Math.random() * 14;
      if (z < far) z = cz + 4 - Math.random() * 6;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={spark}
        color="#fff6e8"
        size={SMALL ? 2.15 : 2.4}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={0.3}
        blending={AdditiveBlending}
        toneMapped={false}
        fog
      />
    </points>
  );
}

function SignFigure({ index, data }: { index: number; data: Constellation }) {
  const cores = useRef<Points>(null);
  const art = useRef<Mesh>(null);
  const nova = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const tint = useMemo(() => new Color(GALAXY_TINT[data.element]), [data.element]);
  const artTex = useMemo(() => loadSignArt(data.id), [data.id]);
  const spark = useMemo(() => makeSparkTexture(), []);
  const pairs = useMemo(() => pairFigures(data.animal, data.figure), [data.animal, data.figure]);
  const figureN = pairs.length;
  const dustN = SMALL ? 14 : 22;
  const n = figureN + dustN;
  const dust = useMemo(() => constellationDust(index, dustN), [index, dustN]);
  const scatter = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const a = index * 1.73 + i * 2.399;
      const b = index * 0.91 + i * 1.618;
      const r = 12.5 + (i % 7) * 2.8;
      return new Vector3(Math.cos(a) * r, Math.sin(b) * (7.4 + (i % 5) * 1.1), Math.sin(a) * r * 0.82);
    });
  }, [n, index]);
  const starGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  const pick = () => useVault.getState().openBirthChat(data.id);

  useEffect(() => {
    return () => {
      spark.dispose();
      starGeo.dispose();
      // LOCKED: never dispose artTex / sign canvases.
    };
  }, [spark, starGeo]);

  useFrame(({ camera, clock }) => {
    const mesh = cores.current;
    const g = group.current;
    if (!mesh || !g) return;
    hydrateSignArt(data.id, artTex);
    const chatting = useVault.getState().chat;
    const held = chatting && useVault.getState().pickedSign === data.id;
    const along = held ? 0.42 : alongToGate(galaxyTravel.t, index);
    const nIdx = nearestSign(galaxyTravel.t);
    const incoming = index === (nIdx + 1) % COUNT;
    const focused = held || index === aimedIndex() || index === nIdx;
    pathAt(index, g.position);
    g.quaternion.copy(camera.quaternion);
    const local = held ? 1 : gateForm(along, index, galaxyTravel.t);
    const form =
      Math.max(
        local,
        focused && along < 2.9 && along > -0.35 ? 0.97 : incoming && along < 2.1 && along > 0.15 ? 0.78 : 0,
      ) * Math.max(galaxyTravel.awaken, held || focused || incoming ? 1 : 0);
    const cinematic = !held && galaxyTravel.playUntil != null;
    const morph = held ? 1 : cinematic ? signMorph(along) : focused ? Math.min(signMorph(along), 0.35) : 0;
    const burst = held ? 0 : cinematic ? morphBurst(along) : 0;
    const plateOn = artReady(artTex);

    if (form < 0.008 && !held && !focused && !incoming) {
      mesh.visible = false;
      if (art.current) art.current.visible = false;
      if (nova.current) nova.current.visible = false;
      return;
    }
    mesh.visible = true;

    const pos = mesh.geometry.getAttribute("position") as BufferAttribute;
    const col = mesh.geometry.getAttribute("color") as BufferAttribute;
    const time = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const isDust = i >= figureN;
      const gather = starGather(along, i, n);
      const sc = scatter[i]!;
      let x: number;
      let y: number;
      let z: number;
      let mag: number;
      if (isDust) {
        const d = dust[i - figureN]!;
        mag = d.mag;
        if (form < 0.18 || morph < 0.12) {
          pos.setXYZ(i, 0, 80, 0);
          col.setXYZ(i, 0, 0, 0);
          continue;
        }
        x = d.x;
        y = d.y;
        z = ((i % 3) - 1) * 0.16;
      } else {
        const p = pairs[i]!;
        mag = p.am + (p.gm - p.am) * morph;
        const fx = (p.ax + (p.gx - p.ax) * morph) * 1.08;
        const fy = (p.ay + (p.gy - p.ay) * morph) * 1.08;
        const kick = 1 + burst * 0.82;
        x = fx * gather * kick + sc.x * (1 - gather);
        y = fy * gather * kick + sc.y * (1 - gather);
        z = sc.z * (1 - gather) * 0.4;
      }
      pos.setXYZ(i, x, y, z);
      const sparkle = starSpark(time, i, index * 1.7);
      const b = Math.min(1.18, sparkle * (0.5 + mag * 0.55) * (0.35 + form * 0.75 + burst * 0.28));
      const lift = 0.58 + mag * 0.42;
      col.setXYZ(i, tint.r * lift * b, tint.g * lift * b, tint.b * lift * b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    if (art.current) {
      const mat = art.current.material as MeshBasicMaterial;
      // LOCKED: always-on art for focused/incoming. Do not gate opacity on morph/burst.
      const plateVis = (focused || incoming || held) && along > -0.55 && along < 2.6;
      const show = plateVis && plateOn;
      art.current.visible = show;
      art.current.frustumCulled = false;
      art.current.renderOrder = 10;
      if (show) {
        const aspect = artAspect(artTex);
        const wide = (SMALL ? 22.5 : 19.4) + Math.min(Math.max(along, 0), 1.2) * 1.6;
        art.current.scale.set(wide, wide / aspect, 1);
        mat.opacity = focused || held ? 1 : incoming ? 0.72 : 0.9;
        mat.map = artTex;
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      } else {
        mat.opacity = 0;
      }
    }
    if (nova.current) {
      nova.current.visible = burst > 0.04;
      nova.current.scale.setScalar(6.2 + burst * 20);
      const nm = nova.current.material as MeshBasicMaterial;
      nm.opacity = burst * 0.58;
    }
  });

  return (
    <group ref={group} frustumCulled={false} onClick={(e) => { e.stopPropagation(); pick(); }}>
      <mesh
        ref={art}
        position={[0, 0.05, -0.06]}
        visible={false}
        renderOrder={10}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={artTex}
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
      <mesh ref={nova} position={[0, 0, -0.2]} visible={false} renderOrder={5} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={spark}
          color={tint}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <points ref={cores} geometry={starGeo} frustumCulled={false}>
        <pointsMaterial
          map={spark}
          vertexColors
          size={SMALL ? 3.1 : 2.6}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          fog={false}
        />
      </points>
    </group>
  );
}

function GalaxyRig() {
  const { camera } = useThree();
  const vel = useRef(0);
  const booted = useRef(false);

  useFrame((_, dt) => {
    const d = Math.min(0.05, Math.max(0.008, dt));
    const chatting = useVault.getState().chat;
    const entered = useVault.getState().entered;
    const birthing = !entered && galaxyTravel.birth < 1;
    if (stepBirth(d)) useGalaxy.getState().markBorn();
    else if (galaxyTravel.birth >= 1) useGalaxy.getState().markBorn();

    galaxyTravel.busy = chatting || entered || birthing;
    const hands = galaxyTravel.dragging || performance.now() < galaxyTravel.wheelUntil;
    galaxyTravel.handsOn = hands || galaxyTravel.hold !== 0;

    if (!booted.current) {
      booted.current = true;
      galaxyTravel.t = prefersReducedMotion() ? 0 : galaxyTravel.t;
    }

    const sought = stepSeek(galaxyTravel.t, d);
    galaxyTravel.t = sought.t;
    const playing = stepPlayUntil(galaxyTravel.t);
    galaxyTravel.traveling = sought.active || playing || galaxyTravel.seek != null;

    if (birthing) vel.current = 0;
    else if (chatting) {
      vel.current *= Math.exp(-d * 3.4);
      if (Math.abs(vel.current) < 0.03) vel.current = 0;
    } else if (sought.active) {
      vel.current *= Math.exp(-d * 2.2);
    } else if ((hands || galaxyTravel.hold !== 0) && !entered) {
      const want = galaxyTravel.hold !== 0 ? galaxyTravel.hold * HOLD_FLY : galaxyTravel.ptrY > 0.08 ? HOLD_FLY : galaxyTravel.ptrY < -0.08 ? -HOLD_FLY : 0;
      if (want === 0) vel.current *= Math.exp(-d * 2.6);
      else vel.current += (want - vel.current) * (1 - Math.exp(-d * 4.2));
      vel.current = Math.max(-MAX_FLY, Math.min(MAX_FLY, vel.current));
      galaxyTravel.moved = true;
      galaxyTravel.awaken = 1;
    } else if (playing) {
      vel.current += (PLAY_CRUISE - vel.current) * (1 - Math.exp(-d * 0.55));
    } else {
      vel.current += (CRUISE - vel.current) * (1 - Math.exp(-d * 0.35));
    }

    if (!birthing && !chatting && !entered) {
      galaxyTravel.t += vel.current * d;
      if (Math.abs(vel.current) > 0.02) galaxyTravel.moved = true;
    }
    galaxyTravel.speed = vel.current;
    if (galaxyTravel.moved) galaxyTravel.awaken = Math.min(1, galaxyTravel.awaken + d * 0.7);

    pathAt(galaxyTravel.t, _pos);
    camera.position.lerp(_pos, 1);
    pathAt(galaxyTravel.t + 0.35, _look);
    camera.lookAt(_look);

    if (camera instanceof PerspectiveCamera) {
      if (camera.far < 320) {
        camera.far = 320;
        camera.updateProjectionMatrix();
      }
      const b = galaxyTravel.birth;
      const burst = chatting ? 0 : morphBurst(alongToGate(galaxyTravel.t, nearestSign(galaxyTravel.t)));
      const fovWant = birthing ? 54 + birthIgnite(b) * 4 + birthBoom(b) * 5.5 : chatting ? 56 : 58 + Math.min(4, Math.abs(vel.current) * 2.2) + burst * 2.6;
      if (Math.abs(camera.fov - fovWant) > 0.05) {
        camera.fov += (fovWant - camera.fov) * (1 - Math.exp(-d * 4));
        camera.updateProjectionMatrix();
      }
    }
    useGalaxy.getState().setTravel(galaxyTravel.t, galaxyTravel.moved);
  });
  return null;
}

function SceneClick() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && galaxyTravel.birth < 1) {
        skipBirth();
        useGalaxy.getState().markBorn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

export function GalaxyIntro() {
  useEffect(() => {
    preloadSignArt();
  }, []);
  return (
    <Canvas
      className="canvas-root"
      dpr={canvasDpr()}
      gl={glContextAttrs()}
      camera={{ position: [0, 0, SEEK_ARRIVE * SPACING], fov: 58, near: 0.1, far: 320 }}
      onCreated={({ gl }) => {
        gl.setClearColor("#0c0b0a", 0);
      }}
      onPointerMissed={() => {
        if (galaxyTravel.birth < 1) {
          skipBirth();
          useGalaxy.getState().markBorn();
        }
      }}
    >
      <color attach="background" args={["#0c0b0a"]} />
      <fog attach="fog" args={["#0c0b0a", SPACING * 0.62, SPACING * 3.6]} />
      <SceneClick />
      <GalaxyRig />
      <StarField />
      {/* LOCKED: all 12 SignFigures stay mounted. Never unmount off-screen into a blank remount. */}
      {CONSTELLATIONS.map((data, index) => (
        <SignFigure key={data.id} index={index} data={data} />
      ))}
    </Canvas>
  );
}

