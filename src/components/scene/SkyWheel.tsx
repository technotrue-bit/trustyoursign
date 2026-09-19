import { createContext, useContext, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  DoubleSide,
  EdgesGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type LineBasicMaterial,
} from "three";
import { ASPECT_COLOR } from "@/lib/chart/aspects";
import { lonToXZ } from "@/lib/chart/geometry";
import { galaxyTravel } from "@/lib/galaxy/travel";
import { useNativity } from "@/lib/chart/nativity";
import { useSessionHovered, useSessionSelection } from "@/lib/chart/session/hooks";
import type { PlanetId } from "@/lib/chart/types";
import { useGalaxy } from "@/lib/galaxy/store";
import { isSmallGpu } from "@/lib/gpu";
import { Label } from "./Label";
import { usePick } from "./pick";
import { dashBetween, LivingAspectSegments, ThinSegments, type AspectSeg, type Seg } from "./ThinLines";

const INNER = 4.15;
const OUTER = 6.55;
const SIGN_R = 6.95;

const ORB_GEO = new SphereGeometry(1, 16, 16);
const HALO_GEO = new SphereGeometry(1, 10, 10);

type WheelLife = { wake: number; paused: boolean };
type WheelLifeRef = MutableRefObject<WheelLife>;

const WheelLifeCtx = createContext<WheelLifeRef | null>(null);

function useWheelLifeRef(): WheelLifeRef {
  const ctx = useContext(WheelLifeCtx);
  const fallback = useRef<WheelLife>({ wake: 1, paused: false });
  return ctx ?? fallback;
}

function phaseHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000 * Math.PI * 2;
}

function easeOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) * (1 - x) * (1 - x);
}

export function SkyWheel({ active }: { active: boolean }) {
  const nat = useNativity();
  const paused = useGalaxy((s) => s.paused);
  const root = useRef<Group>(null);
  const lifeRef = useRef<WheelLife>({ wake: active ? 1 : 0, paused });
  const wasActive = useRef(active);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    if (active && !wasActive.current) lifeRef.current.wake = 0;
    wasActive.current = active;
    if (active) lifeRef.current.wake = Math.min(1, lifeRef.current.wake + d / 0.78);
    else lifeRef.current.wake = 0;
    lifeRef.current.paused = paused;

    if (!root.current) return;
    root.current.visible = active;
    const w = easeOutCubic(lifeRef.current.wake);
    root.current.scale.setScalar(0.965 + w * 0.035);
  });

  if (!nat) return null;
  return (
    <WheelLifeCtx.Provider value={lifeRef}>
      <group ref={root} visible={active}>
        <VaultCore />
        <EclipticRings />
        <WheelLines />
        <WheelLabels />
        {nat.planets.map((p, i) => (
          <PlanetOrb key={`${nat.id}-${p.id}`} id={p.id} index={i} />
        ))}
      </group>
    </WheelLifeCtx.Provider>
  );
}

function VaultCore() {
  const group = useRef<Group>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const life = useWheelLifeRef();
  const { geom, edges } = useMemo(() => {
    const g = new DodecahedronGeometry(0.52, 0);
    return { geom: g, edges: new EdgesGeometry(g) };
  }, []);

  useEffect(() => {
    return () => {
      geom.dispose();
      edges.dispose();
    };
  }, [geom, edges]);

  useFrame((_, delta) => {
    const { wake, paused } = life.current;
    const d = Math.min(delta, 0.1);
    const t = galaxyTravel.shaderTime;
    if (!group.current) return;
    if (!paused) group.current.rotation.y += d * 0.12;
    const breathe = paused ? 1 : 1 + Math.sin(t * 0.9) * 0.02;
    const w = easeOutCubic(wake);
    group.current.scale.setScalar(breathe * (0.88 + w * 0.12));
    if (edgeMat.current) {
      const pulse = paused ? 0 : Math.sin(t * 1.1) * 0.06;
      edgeMat.current.opacity = (0.55 + pulse) * (0.35 + w * 0.65);
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geom}>
        <meshBasicMaterial color="#161310" />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial ref={edgeMat} color="#efe8dc" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

function EclipticRings() {
  const segs = isSmallGpu() ? 48 : 96;
  const fill = useRef<Mesh>(null);
  const fillMat = useRef<MeshBasicMaterial>(null);
  const life = useWheelLifeRef();

  useFrame((_, delta) => {
    const { wake, paused } = life.current;
    const d = Math.min(delta, 0.1);
    const t = galaxyTravel.shaderTime;
    const w = easeOutCubic(wake);
    if (fill.current && !paused) fill.current.rotation.z += d * 0.018;
    if (fillMat.current) {
      const pulse = paused ? 0 : Math.sin(t * 0.55) * 0.012;
      fillMat.current.opacity = (0.055 + pulse) * (0.4 + w * 0.6);
    }
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[OUTER - 0.05, OUTER + 0.05, segs]} />
        <meshBasicMaterial color="#efe8dc" transparent opacity={0.7} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[INNER - 0.03, INNER + 0.03, segs]} />
        <meshBasicMaterial color="#d8cfc0" transparent opacity={0.32} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[OUTER + 0.4, segs]} />
        <meshBasicMaterial color="#141210" transparent opacity={0.55} side={DoubleSide} />
      </mesh>
      <mesh ref={fill} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[INNER, OUTER, segs]} />
        <meshBasicMaterial
          ref={fillMat}
          color="#efe8dc"
          transparent
          opacity={0.055}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}

function WheelLines() {
  const nat = useNativity();
  if (!nat) return null;
  const selection = useSessionSelection();
  const hovered = useSessionHovered();
  const focus =
    (selection?.kind === "planet" && selection.id) ||
    (hovered?.kind === "planet" && hovered.id) ||
    null;
  const lifeRef = useContext(WheelLifeCtx);

  const structure = useMemo(() => {
    const segs: Seg[] = [];
    for (const c of nat.houses) {
      const [x1, z1] = lonToXZ(c.lon, INNER, nat.angles);
      const [x2, z2] = lonToXZ(c.lon, OUTER + 0.15, nat.angles);
      const angle = c.house === 1 || c.house === 4 || c.house === 7 || c.house === 10;
      segs.push({
        a: [x1, 0, z1],
        b: [x2, 0, z2],
        color: "#efe8dc",
        opacity: angle ? 0.7 : 0.28,
      });
    }
    for (const sign of nat.signs) {
      const [ax, az] = lonToXZ(sign.startLon, OUTER - 0.08, nat.angles);
      const [bx, bz] = lonToXZ(sign.startLon, OUTER + 0.22, nat.angles);
      const a: [number, number, number] = [ax, 0, az];
      const b: [number, number, number] = [bx, 0, bz];
      const opacity = sign.intercepted ? 0.18 : 0.32;
      if (sign.intercepted) segs.push(...dashBetween(a, b, "#d8cfc0", opacity));
      else segs.push({ a, b, color: "#d8cfc0", opacity });
    }
    return segs;
  }, [nat]);

  const aspects = useMemo(() => {
    const segs: AspectSeg[] = [];
    for (const asp of nat.aspects) {
      const pa = nat.planetById[asp.a];
      const pb = nat.planetById[asp.b];
      if (!pa || !pb) continue;
      const [ax, az] = lonToXZ(pa.lon, pa.radius, nat.angles);
      const [bx, bz] = lonToXZ(pb.lon, pb.radius, nat.angles);
      segs.push({
        a: [ax, 0.08, az],
        b: [bx, 0.08, bz],
        color: ASPECT_COLOR[asp.type],
        restOpacity: asp.iron ? 0.42 : 0.14,
        iron: asp.iron,
        planetA: asp.a,
        planetB: asp.b,
        phase: phaseHash(asp.id),
      });
    }
    return segs;
  }, [nat]);

  return (
    <>
      <ThinSegments segments={structure} />
      <LivingAspectSegments segments={aspects} focus={focus} lifeRef={lifeRef} />
    </>
  );
}

function WheelLabels() {
  const nat = useNativity();
  if (!nat) return null;
  const selected = useSessionSelection();
  return (
    <group>
      {nat.houses.map((c) => {
        const [lx, lz] = lonToXZ(c.lon, INNER - 0.45, nat.angles);
        return (
          <Label key={`h-${c.house}`} position={[lx, 0.08, lz]} fontSize={0.16} color="#9a9186">
            {String(c.house)}
          </Label>
        );
      })}
      {nat.signs.map((sign) => {
        const [tx, tz] = lonToXZ(sign.startLon + 15, SIGN_R, nat.angles);
        const isSel = selected?.kind === "sign" && selected.id === sign.id;
        return (
          <group key={sign.id}>
            <Label
              position={[tx, 0.12, tz]}
              fontSize={isSel ? 0.2 : 0.16}
              color={isSel ? "#efe8dc" : sign.intercepted ? "#6e675e" : "#9a9186"}
            >
              {sign.abbr.toUpperCase()}
            </Label>
            <SignHit tx={tx} tz={tz} id={sign.id} />
          </group>
        );
      })}
    </group>
  );
}

function SignHit({ tx, tz, id }: { tx: number; tz: number; id: string }) {
  const pick = usePick("sign", id);
  return (
    <mesh position={[tx, 0, tz]} rotation={[-Math.PI / 2, 0, 0]} {...pick}>
      <circleGeometry args={[0.38, 16]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function PlanetOrb({ id, index }: { id: PlanetId; index: number }) {
  const nat = useNativity();
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const haloOp = useRef(0.28);
  const life = useWheelLifeRef();
  const selection = useSessionSelection();
  const hovered = useSessionHovered();
  const pick = usePick("planet", id);
  const planet = nat?.planetById[id];
  const selected =
    (selection?.kind === "planet" && selection.id === id) ||
    (hovered?.kind === "planet" && hovered.id === id);
  const showLabel = Boolean(planet && nat && (selected || nat.alwaysLabel.includes(id)));
  const luminous = Boolean(
    planet && nat && (id === "sun" || id === "moon" || nat.alwaysLabel.includes(id)),
  );
  const orb = planet ? planet.size * 1.35 : 0.1;
  const halo = planet ? planet.size * 3.1 : 0.2;
  const phase = planet ? phaseHash(id) + planet.lon * 0.04 : phaseHash(id);
  const bobAmp = luminous ? 0.07 : 0.05;
  const pulseAmp = luminous ? 0.12 : 0.08;
  const [x, z] = planet && nat ? lonToXZ(planet.lon, planet.radius, nat.angles) : [0, 0];

  useFrame((_, delta) => {
    if (!planet) return;
    const { wake, paused } = life.current;
    const d = Math.min(delta, 0.1);
    const t = galaxyTravel.shaderTime;
    const wakeEase = easeOutCubic(Math.max(0, (wake - index * 0.045) / 0.55));
    const bob = paused ? 0 : Math.sin(t * 0.65 + phase) * bobAmp;
    if (group.current) {
      group.current.position.y = 0.12 + bob;
      group.current.scale.setScalar(0.72 + wakeEase * 0.28);
    }
    const pulseRate = selected ? 1.05 : 1.6;
    const pulse = paused ? 1 : 1 + Math.sin(t * pulseRate + phase) * pulseAmp * (selected ? 1.35 : 1);
    const scaleTarget = (selected ? 1.45 : 1) * pulse * halo * (0.55 + wakeEase * 0.45);
    if (glow.current) {
      const s = glow.current.scale.x;
      glow.current.scale.setScalar(s + (scaleTarget - s) * (1 - Math.exp(-d * 6)));
      const mat = glow.current.material as MeshBasicMaterial;
      const opTarget = (selected ? 0.5 : 0.28) * (0.25 + wakeEase * 0.75);
      haloOp.current += (opTarget - haloOp.current) * (1 - Math.exp(-d * 7));
      mat.opacity = haloOp.current;
    }
    if (core.current) {
      const mat = core.current.material as MeshBasicMaterial;
      const bright = selected ? 1.12 : 1;
      mat.color.set(planet.color).multiplyScalar(bright);
    }
  });

  if (!nat || !planet) return null;

  return (
    <group ref={group} position={[x, 0.12, z]}>
      <mesh ref={core} geometry={ORB_GEO} scale={orb} {...pick}>
        <meshBasicMaterial color={planet.color} />
      </mesh>
      <mesh ref={glow} geometry={HALO_GEO} scale={halo} {...pick}>
        <meshBasicMaterial
          color={planet.glow}
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {showLabel ? (
        <Label position={[0, planet.size + 0.28, 0]} fontSize={0.15} color="#efe8dc" anchorY="bottom">
          {planet.glyph}
        </Label>
      ) : null}
    </group>
  );
}
