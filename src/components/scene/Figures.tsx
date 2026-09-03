import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { AdditiveBlending, DoubleSide, Group, Mesh } from "three";
import { lonToXZ } from "@/lib/chart/geometry";
import { useNativity } from "@/lib/chart/nativity";
import type { ChakraId, GateId } from "@/lib/chart/types";
import { useVault } from "@/lib/store";
import { Label } from "./Label";
import { usePick } from "./pick";
import { ThinLoop } from "./ThinLines";

export function ChakraBody({ active }: { active: boolean }) {
  const nat = useNativity();
  if (!nat) return null;
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
  if (!nat) return null;
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
  if (!nat) return null;
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
  if (!nat) return null;
  const gate = nat.gates.find((g) => g.id === id);
  const glow = useRef<Mesh>(null);
  const selection = useVault((s) => s.selection);
  const hovered = useVault((s) => s.hovered);
  const pick = usePick("gate", id);
  const colors: Record<GateId, string> = {
    rising: "#d8cfc0",
    sun: "#e6c98a",
    moon: "#c4a0aa",
  };
  const active =
    (selection?.kind === "gate" && selection.id === id) ||
    (hovered?.kind === "gate" && hovered.id === id);
  const color = colors[id];

  useFrame((state) => {
    if (!glow.current) return;
    const t = state.clock.elapsedTime;
    const o = (active ? 0.28 : 0.1) + Math.sin(t * 1.2 + x) * 0.04;
    const mat = glow.current.material;
    if (!Array.isArray(mat) && "opacity" in mat) mat.opacity = o;
  });

  if (!gate) return null;

  return (
    <group position={[x, 1.45, 0]}>
      <mesh {...pick}>
        <torusGeometry args={[1.28, 0.045, 12, 64]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glow} {...pick}>
        <circleGeometry args={[1.22, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          side={DoubleSide}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <Billboard position={[0, -1.62, 0]}>
        <Label
          fontSize={0.18}
          color={active ? "#efe8dc" : "#9a9186"}
          anchorX="center"
          letterSpacing={0.16}
        >
          {gate.name.toUpperCase()}
        </Label>
      </Billboard>
    </group>
  );
}

export function DecisionMachine({ active }: { active: boolean }) {
  const nat = useNativity();
  if (!nat) return null;
  const venus = nat.planetById.venus;
  if (!venus || nat.steps.length === 0) return null;
  const [vx, vz] = lonToXZ(venus.lon, 0, nat.angles);
  const count = nat.steps.length;
  const nodes = useMemo(() => {
    return nat.steps.map((step, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      return { step, x: Math.cos(a) * 3.2, z: Math.sin(a) * 3.2 };
    });
  }, [nat.steps, count]);

  const points = nodes.map((n) => [n.x, 0.05, n.z] as [number, number, number]);
  points.push(points[0]!);

  return (
    <group visible={active}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[3.05, 3.35, 64]} />
        <meshBasicMaterial color="#d8cfc0" transparent opacity={0.12} side={DoubleSide} />
      </mesh>
      <ThinLoop points={points} color="#d8cfc0" opacity={0.25} />
      <group position={[vx, 0.2, vz]}>
        <mesh>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshBasicMaterial color={venus.color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.48, 16, 16]} />
          <meshBasicMaterial
            color={venus.glow}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        <Billboard position={[0, 0.55, 0]}>
          <Label fontSize={0.14} color="#efe8dc" anchorX="center" letterSpacing={0.12}>
            ENGINE
          </Label>
        </Billboard>
      </group>
      {nodes.map((n) => (
        <MachineNode key={n.step.n} n={n.step.n} title={n.step.title} x={n.x} z={n.z} />
      ))}
    </group>
  );
}

function MachineNode({
  n,
  title,
  x,
  z,
}: {
  n: number;
  title: string;
  x: number;
  z: number;
}) {
  const glow = useRef<Group>(null);
  const selection = useVault((s) => s.selection);
  const hovered = useVault((s) => s.hovered);
  const pick = usePick("step", String(n));
  const active =
    (selection?.kind === "step" && selection.id === String(n)) ||
    (hovered?.kind === "step" && hovered.id === String(n));

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    if (!glow.current) return;
    const t = active ? 1.25 : 1;
    const s = glow.current.scale.x;
    const next = s + (t - s) * (1 - Math.exp(-d * 7));
    glow.current.scale.setScalar(next);
  });

  return (
    <group position={[x, 0.12, z]} ref={glow}>
      <mesh {...pick}>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshBasicMaterial color={active ? "#efe8dc" : "#c4b8a8"} />
      </mesh>
      <Billboard position={[0, 0.38, 0]}>
        <Label fontSize={0.13} color="#efe8dc" anchorX="center">
          {n}
        </Label>
      </Billboard>
      <Billboard position={[0, -0.32, 0]}>
        <Label fontSize={0.11} color="#9a9186" anchorX="center" maxWidth={1.8} textAlign="center">
          {title}
        </Label>
      </Billboard>
    </group>
  );
}
