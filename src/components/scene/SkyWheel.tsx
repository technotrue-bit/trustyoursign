import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Line, Text } from "@react-three/drei";
import {
  AdditiveBlending,
  DoubleSide,
  EdgesGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
} from "three";
import { ASPECT_COLOR } from "@/lib/chart/aspects";
import { lonToXZ } from "@/lib/chart/geometry";
import { useNativity } from "@/lib/chart/nativity";
import type { PlanetId } from "@/lib/chart/types";
import { useVault } from "@/lib/store";
import { usePick } from "./pick";
import { isAppleTouch } from "@/lib/gpu";

const INNER = 4.15;
const OUTER = 6.55;
const SIGN_R = 6.95;

export function SkyWheel({ active }: { active: boolean }) {
  const nat = useNativity();
  return (
    <group visible={active}>
      <VaultCore />
      <EclipticRings />
      <HouseLines />
      <SignMarks />
      <AspectWires />
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
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[OUTER - 0.05, OUTER + 0.05, 128]} />
        <meshBasicMaterial color="#efe8dc" transparent opacity={0.7} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[INNER - 0.03, INNER + 0.03, 96]} />
        <meshBasicMaterial color="#d8cfc0" transparent opacity={0.32} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[OUTER + 0.4, 64]} />
        <meshBasicMaterial color="#141210" transparent opacity={0.55} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[INNER, OUTER, 96]} />
        <meshBasicMaterial color="#efe8dc" transparent opacity={0.055} side={DoubleSide} />
      </mesh>
    </>
  );
}

function HouseLines() {
  const nat = useNativity();
  return (
    <group>
      {nat.houses.map((c) => {
        const [x1, z1] = lonToXZ(c.lon, INNER, nat.angles);
        const [x2, z2] = lonToXZ(c.lon, OUTER + 0.15, nat.angles);
        const angle = c.house === 1 || c.house === 4 || c.house === 7 || c.house === 10;
        const [lx, lz] = lonToXZ(c.lon, INNER - 0.45, nat.angles);
        return (
          <group key={c.house}>
            <Line
              points={[
                [x1, 0, z1],
                [x2, 0, z2],
              ]}
              color="#efe8dc"
              lineWidth={angle ? 1.6 : 1}
              transparent
              opacity={angle ? 0.7 : 0.28}
            />
            <Billboard position={[lx, 0.08, lz]}>
              {isAppleTouch() ? null : (
              <Text
                fontSize={0.16}
                color="#9a9186"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.08}
              >
                {String(c.house)}
              </Text>
              )}
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

function SignMarks() {
  const selected = useVault((s) => s.selection);
  return (
    <group>
      {SIGNS.map((sign) => {
        const [tx, tz] = lonToXZ(sign.startLon + 15, SIGN_R);
        const [ax, az] = lonToXZ(sign.startLon, OUTER - 0.08);
        const [bx, bz] = lonToXZ(sign.startLon, OUTER + 0.22);
        const isSel = selected?.kind === "sign" && selected.id === sign.id;
        const pick = usePick("sign", sign.id);
        return (
          <group key={sign.id}>
            <Line
              points={[
                [ax, 0, az],
                [bx, 0, bz],
              ]}
 
... 