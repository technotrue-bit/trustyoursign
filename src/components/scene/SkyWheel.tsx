import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  DoubleSide,
  EdgesGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  SphereGeometry,
} from "three";
import { ASPECT_COLOR } from "@/lib/chart/aspects";
import { lonToXZ } from "@/lib/chart/geometry";
import { galaxyTravel } from "@/lib/galaxy/travel";
import { useNativity } from "@/lib/chart/nativity";
import { useSessionHovered, useSessionSelection } from "@/lib/chart/session/hooks";
import type { PlanetId } from "@/lib/chart/types";
import { isSmallGpu } from "@/lib/gpu";
import { Label } from "./Label";
import { usePick } from "./pick";
import { dashBetween, ThinSegments, type Seg } from "./ThinLines";

const INNER = 4.15;
const OUTER = 6.55;
const SIGN_R = 6.95;

const ORB_GEO = new SphereGeometry(1, 16, 16);
const HALO_GEO = new SphereGeometry(1, 10, 10);

export function SkyWheel({ active }: { active: boolean }) {
  const nat = useNativity();
  if (!nat) return null;
  return (
    <group visible={active}>
      <VaultCore />
      <EclipticRings />
      <WheelLines />
      <WheelLabels />
      {nat.planets.map((p) => (
        <PlanetOrb key={`${nat.id}-${p.id}`} id={p.id} />
      ))}
    </group>
  );
}

function VaultCore() {
  const group = useRef<Group>(null);
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
    const d = Math.min(delta, 0.1);
    if (group.current) group.current.rotation.y += d * 0.12;
  });

  return (
    <group ref={group}>
      <mesh geometry={geom}>
        <meshBasicMaterial color="#161310" />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#efe8dc" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

function EclipticRings() {
  const segs = isSmallGpu() ? 48 : 96;
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[INNER, OUTER, segs]} />
        <meshBasicMaterial color="#efe8dc" transparent opacity={0.055} side={DoubleSide} />
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

  const segments = useMemo(() => {
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
    for (const asp of nat.aspects) {
      const pa = nat.planetById[asp.a];
      const pb = nat.planetById[asp.b];
      if (!pa || !pb) continue;
      const [ax, az] = lonToXZ(pa.lon, pa.radius, nat.angles);
      const [bx, bz] = lonToXZ(pb.lon, pb.radius, nat.angles);
      const lit = focus === asp.a || focus === asp.b;
      const dim = focus && !lit;
      const opacity = dim ? 0.04 : lit ? 0.85 : asp.iron ? 0.42 : 0.14;
      segs.push({
        a: [ax, 0.08, az],
        b: [bx, 0.08, bz],
        color: ASPECT_COLOR[asp.type],
        opacity,
      });
    }
    return segs;
  }, [nat, focus]);

  return <ThinSegments segments={segments} />;
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

function PlanetOrb({ id }: { id: PlanetId }) {
  const nat = useNativity();
  if (!nat) return null;
  const planet = nat.planetById[id];
  const group = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const selection = useSessionSelection();
  const hovered = useSessionHovered();
  const pick = usePick("planet", id);
  if (!planet) return null;
  const [x, z] = lonToXZ(planet.lon, planet.radius, nat.angles);
  const active =
    (selection?.kind === "planet" && selection.id === id) ||
    (hovered?.kind === "planet" && hovered.id === id);
  const showLabel = active || nat.alwaysLabel.includes(id);
  const orb = planet.size * 1.35;
  const halo = planet.size * 3.1;

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const t = galaxyTravel.shaderTime;
    if (group.current) {
      group.current.position.y = 0.12 + Math.sin(t * 0.65 + planet.lon * 0.04) * 0.05;
    }
    if (glow.current) {
      const pulse = 1 + Math.sin(t * 1.6 + planet.lon) * 0.08;
      const target = active ? 1.45 : 1;
      const s = glow.current.scale.x;
      const next = s + (target * pulse * halo - s) * (1 - Math.exp(-d * 6));
      glow.current.scale.setScalar(next);
    }
  });

  return (
    <group ref={group} position={[x, 0.12, z]}>
      <mesh geometry={ORB_GEO} scale={orb} {...pick}>
        <meshBasicMaterial color={planet.color} />
      </mesh>
      <mesh ref={glow} geometry={HALO_GEO} scale={halo} {...pick}>
        <meshBasicMaterial
          color={planet.glow}
          transparent
          opacity={active ? 0.5 : 0.28}
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
