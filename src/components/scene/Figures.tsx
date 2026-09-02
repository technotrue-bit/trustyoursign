import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Line } from "@react-three/drei";
import { AdditiveBlending, DoubleSide, Group, Mesh } from "three";
import { lonToXZ } from "@/lib/chart/geometry";
import { useNativity } from "@/lib/chart/nativity";
import type { ChakraId, GateId } from "@/lib/chart/types";
import { useVault } from "@/lib/store";
import { Label } from "./Label";
import { usePick } from "./pick";

export function ChakraBody({ active }: { active: boolean }) {
  const nat = useNativity();
  return (
    <group visible={active} position={[0, -0.15, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.32, 1.35, 6, 16]} />
        <meshBasicMaterial color="#1a1613" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 2.08, 0]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshBasicMaterial color="#1a1613" transparent opacity={0.72} />
      </mesh>
      <mesh position={[-0.42, 1.62, 0]} rotation={[0, 0, 0.55]}>
        <capsuleGeometry args={[0.08, 0.55, 4, 10]} />
        <meshBasicMaterial color="#1a1613" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.42, 1.62, 0]} rotation={[0, 0, -0.55]}>
        <capsuleGeometry args={[0.08, 0.55, 4, 10]} />
        <meshBasicMaterial color="#1a1613" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 2.15, 8]} />
        <meshBasicMaterial color="#efe8dc" transparent opacity={0.22} />
      </mesh>
      {nat.chakras.map((c) => (
        <ChakraOrb key={c.id} id={c.id} />
      ))}
    </group>
  );
}

function ChakraOrb({ id }: { id: ChakraId }) {
  const nat = useNativity();
  const chakra = nat.chakraById[id];
  const glow = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const selection = useVault((s) => s.selection);
  const hovered = useVault((s) => s.hovered);
  const pick = usePick("chakra", id);
  const active =
    (selection?.kind === "chakra" && selection.id === id) ||
    (hovered?.kind === "chakra" && hovered.id === id);

  useFrame((state, delta) => {
    if (!chakra) return;
    const d = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    if (glow.current) {
      const pulse = 1 + Math.sin(t * 1.4 + chakra.y * 4) * 0.1;
      const target = (active ? 1.5 : 1) * pulse;
      const s = glow.current.scale.x;
      glow.current.scale.setScalar(s + (target - s) * (1 - Math.exp(-d * 6)));
    }
    if (ring.current) ring.current.rotation.z = t * 0.25;
  });

  if (!chakra) return null;

  return (
    <group position={[0, chakra.y, 0.12]}>
      <mesh {...pick}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshBasicMaterial color={chakra.color} />
      </mesh>
      <mesh ref={glow} {...pick}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial
          color={chakra.glow}
          transparent
          opacity={active ? 0.45 : 0.2}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.008, 8, 32]} />
        <meshBasicMaterial color={chakra.color} transparent opacity={active ? 0.7 : 0.28} />
      </mesh>
      <Billboard position={[0.55, 0, 0]}>
        <Label
          fontSize={0.11}
          color={active ? "#efe8dc" : "#9a9186"}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.08}
        >
          {chakra.name.toUpperCase()}
        </Label>
      </Billboard>
    </group>
  );
}

export function GatePortals({ active }: { active: boolean }) {
  const nat = useNativity();
  return (
    <group visible={active}>
      {nat.gates.map((g, i) => (
        <GatePortal key={g.id} id={g.id} x={-3.15 + i * 3.15} />
      ))}
    </group>
  );
}

function GatePortal({ id, x }: { id: GateId; x: number }) {
  const nat = useNativity();
  const gate = nat.gates.find((g) => g.id === id);
  const glow = useRef<Mesh>(null);
  const selection = useVault((s) => s.selection);
  const hovered = useVault((s) => 
... 