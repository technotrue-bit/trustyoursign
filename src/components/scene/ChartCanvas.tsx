import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Color, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buryWebGLCanvas, canvasDpr, glContextAttrs, isSmallGpu } from "@/lib/gpu";
import { lonToXZ } from "@/lib/chart/geometry";
import {
  useIsEntered,
  useNativity,
  useSessionKind,
  useSessionMode,
  useSessionSelection,
} from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { useGalaxy } from "@/lib/galaxy/store";
import type { AppMode, ChakraId, PlanetId } from "@/lib/chart/types";
import { ChakraBody, DecisionMachine, GatePortals } from "./Figures";
import { GalaxyIntro } from "./GalaxyIntro";
import { FrameGovernor } from "./FrameGovernor";
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

const SKY: [number, number, number] = [0, 6.4, 9.6];
const GALAXY_CAM: [number, number, number] = [0, 0.35, 2];

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

function ChartWorld() {
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

function contextLost(el: HTMLCanvasElement | null): boolean {
  if (!el) return false;
  try {
    const gl = el.getContext("webgl2");
    if (!gl) return true;
    return gl.isContextLost();
  } catch {
    return true;
  }
}

/** Apple / modest GPU land gap. Locked at 48ms — do not restore 160ms. */
const SCENE_GATE_MS = 48;

function SceneGate({ charted }: { charted: boolean }) {
  const { camera } = useThree();
  const [view, setView] = useState<"gap" | "galaxy" | "chart">(charted ? "chart" : "galaxy");
  const shown = useRef(charted);

  useLayoutEffect(() => {
    if (shown.current === charted) return;
    setView("gap");
    if (charted) {
      camera.up.set(0, 1, 0);
      camera.position.set(...SKY);
      camera.lookAt(0, 0.1, 0);
    } else {
      camera.up.set(0, 1, 0);
      camera.position.set(...GALAXY_CAM);
      camera.lookAt(0, 0.2, -24);
    }
    const t = window.setTimeout(() => {
      shown.current = charted;
      setView(charted ? "chart" : "galaxy");
    }, SCENE_GATE_MS);
    return () => window.clearTimeout(t);
  }, [charted, camera]);

  return (
    <>
      <FrameGovernor />
      <color attach="background" args={["#0c0b0a"]} />
      {view === "chart" ? <ChartWorld /> : view === "galaxy" ? <GalaxyIntro /> : null}
    </>
  );
}

function failGl() {
  window.dispatchEvent(new Event("vault-webgl-lost"));
}

export function ChartCanvas() {
  const entered = useIsEntered();
  const sessionKind = useSessionKind();
  const nativity = useNativity();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const recover = (el: EventTarget | null) => {
      buryWebGLCanvas(el);
      failGl();
    };
    const onLost = (e: Event) => {
      const canvas = document.querySelector(".canvas-root canvas");
      if (e.target !== canvas) return;
      recover(e.target);
    };
    const onShow = () => {
      if (document.visibilityState === "hidden") return;
      const canvas = document.querySelector(".canvas-root canvas") as HTMLCanvasElement | null;
      if (contextLost(canvas)) recover(canvas);
    };
    window.addEventListener("webglcontextlost", onLost, true);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("webglcontextlost", onLost, true);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return (
    <div className="canvas-root">
      <Canvas
        flat
        fallback={null}
        style={{
          background: "#0c0b0a",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        camera={{
          position: entered ? SKY : GALAXY_CAM,
          fov: entered ? 51 : 64,
          near: 0.08,
          far: 320,
        }}
        dpr={canvasDpr()}
        gl={glContextAttrs()}
        onCreated={({ camera, gl }) => {
          gl.setClearColor(new Color("#0c0b0a"), 1);
          gl.clear(true, true, false);
          const el = gl.domElement;
          if (el) {
            el.style.background = "#0c0b0a";
            el.addEventListener(
              "webglcontextlost",
              () => {
                buryWebGLCanvas(el);
                failGl();
              },
              { capture: true },
            );
          }
          if (useSessionStore.getState().session) {
            camera.position.set(...SKY);
            camera.lookAt(0, 0.1, 0);
          } else {
            camera.position.set(...GALAXY_CAM);
            camera.lookAt(0, 0.2, -24);
          }
          setReady(true);
        }}
        onPointerMissed={(e) => {
          if (e.type === "click") useSessionStore.getState().clear();
        }}
      >
        <SceneGate charted={Boolean(entered && sessionKind !== "shelf" && nativity)} />
      </Canvas>
    </div>
  );
}
