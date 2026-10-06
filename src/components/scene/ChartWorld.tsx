import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { isSmallGpu } from "@/lib/gpu";
import { lonToXZ } from "@/lib/chart/geometry";
import { useIsEntered, useSessionMode, useSessionSelection } from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { useGalaxy } from "@/lib/galaxy/store";
import type { AppMode, ChakraId, PlanetId } from "@/lib/chart/types";
import { ChakraBody, DecisionMachine, GatePortals } from "./Figures";
import { SkyWheel } from "./SkyWheel";

type Pose = { position: [number, number, number]; target: [number, number, number] };

const POSES: Record<AppMode, Pose> = {
  sky: { position: [0, 6.4, 9.6], target: [0, 0.1, 0] },
  body: { position: [3.2, 1.7, 5.2], target: [0, 1.15, 0] },
  gates: { position: [0, 1.7, 11.2], target: [0, 1.2, 0] },
  machine: { position: [0, 7.2, 7.6], target: [0, 0, 0] },
  readings: { position: [2.2, 4.4, 8.2], target: [0, 0.2, 0] },
  bones: { position: [0, 12.5, 0.6], target: [0, 0, 0] },
  ask: { position: [2.2, 4.4, 8.2], target: [0, 0.2, 0] },
};

const _pos = new Vector3();
const _tar = new Vector3();

function poseFor(): Pose {
  const session = useSessionStore.getState().session;
  const mode = session?.mode ?? "sky";
  const selection = session?.selection ?? null;
  const nat = session?.nativity ?? null;
  if (nat && selection?.kind === "planet") {
    const p = nat.planetById[selection.id as PlanetId];
    if (p) {
      const [x, z] = lonToXZ(p.lon, p.radius, nat.angles);
      const len = Math.hypot(x, z) || 1;
      const push = 3.1;
      return {
        position: [x + (x / len) * push, 2.35, z + (z / len) * push],
        target: [x, 0.2, z],
      };
    }
  }
  if (nat && selection?.kind === "chakra") {
    const c = nat.chakraById[selection.id as ChakraId];
    if (c) return { position: [2.6, c.y + 0.35, 4.0], target: [0, c.y, 0] };
  }
  if (selection?.kind === "gate") {
    const x = selection.id === "rising" ? -3.15 : selection.id === "moon" ? 3.15 : 0;
    return { position: [x * 0.2, 1.55, 6.4], target: [x, 1.4, 0] };
  }
  if (selection?.kind === "step") {
    const i = Number(selection.id) - 1;
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * 3.2;
    const z = Math.sin(a) * 3.2;
    return { position: [x * 0.45, 4.6, z * 0.45 + 6.2], target: [x, 0.2, z] };
  }
  return POSES[mode];
}

function CameraRig() {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const mode = useSessionMode();
  const selection = useSessionSelection();
  const entered = useIsEntered();
  const lerpUntil = useRef(0);
  const booted = useRef(false);
  const hold = useRef(12);

  useLayoutEffect(() => {
    const pose = poseFor();
    camera.up.set(0, 1, 0);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    const c = controls.current;
    if (c) {
      c.object.position.copy(camera.position);
      c.target.set(...pose.target);
      c.update();
    }
    booted.current = true;
    lerpUntil.current = 0;
    hold.current = 12;
  }, [camera]);

  useEffect(() => {
    const pose = poseFor();
    const c = controls.current;
    camera.up.set(0, 1, 0);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    if (c) {
      c.object.position.copy(camera.position);
      c.target.set(...pose.target);
      c.update();
    }
    booted.current = true;
    lerpUntil.current = 0;
    hold.current = 12;
  }, [camera]);

  useEffect(() => {
    lerpUntil.current = performance.now() + 1600;
  }, [mode, selection]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const now = performance.now();
    const pose = poseFor();
    const c = controls.current;
    if (hold.current > 0) {
      hold.current -= 1;
      camera.up.set(0, 1, 0);
      camera.position.set(...pose.position);
      camera.lookAt(...pose.target);
      if (c) {
        c.object.position.copy(camera.position);
        c.target.set(...pose.target);
        c.update();
      }
      booted.current = true;
      return;
    }
    if (now < lerpUntil.current) {
      const k = 1 - Math.exp(-d * 2.4);
      camera.position.lerp(_pos.set(...pose.position), k);
      if (c) {
        c.object.position.copy(camera.position);
        c.target.lerp(_tar.set(...pose.target), k);
        c.update();
      } else camera.lookAt(...pose.target);
    }
  });

  const auto = entered && mode === "sky" && !selection;
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={3.2}
      maxDistance={22}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={0.18}
      autoRotate={auto}
      autoRotateSpeed={0.28}
      enabled={entered}
    />
  );
}

export function ChartWorld() {
  const mode = useSessionMode();
  const selection = useSessionSelection();
  // I5: the ambient starfield animates on drei's own clock, so the pause has to
  // reach it as a prop rather than through the shared travel state.
  const paused = useGalaxy((s) => s.paused);
  const ask = mode === "ask";
  const skyOn = mode === "sky" || mode === "bones" || mode === "readings" || ask;
  const bodyOn = mode === "body" || (ask && selection?.kind === "chakra");
  const gatesOn = mode === "gates" || (ask && selection?.kind === "gate");
  const machineOn = mode === "machine" || (ask && selection?.kind === "step");
  const small = isSmallGpu();

  return (
    <>
      <color attach="background" args={["#0c0b0a"]} />
      <fog attach="fog" args={["#0c0b0a", 22, 55]} />
      <ambientLight intensity={0.55} />
      <Stars
        radius={80}
        depth={36}
        count={small ? 400 : 1400}
        factor={3}
        saturation={0}
        fade={!small}
        // I5: drei's starfield drifts on its own internal clock — speed 0 is the
        // only way to still it, so the pause reaches this layer too.
        speed={paused ? 0 : 0.35}
      />
      {skyOn ? <SkyWheel active /> : null}
      {bodyOn ? <ChakraBody active /> : null}
      {gatesOn ? <GatePortals active /> : null}
      {machineOn ? <DecisionMachine active /> : null}
      <CameraRig />
    </>
  );
}
