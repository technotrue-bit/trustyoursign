import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Color } from "three";
import { canvasDpr, glContextAttrs } from "@/lib/gpu";
import { acknowledgeContextLost, SKY_READY_EVENT } from "@/lib/galaxy/contextLost";
import { useIsEntered, useNativity, useSessionKind } from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { GalaxyIntro } from "./GalaxyIntro";
import { FrameGovernor } from "./FrameGovernor";

const SKY: [number, number, number] = [0, 6.4, 9.6];
const GALAXY_CAM: [number, number, number] = [0, 0.35, 2];

function contextLost(el: HTMLCanvasElement | null): boolean {
  if (!el || el.dataset.glAlive !== "1") return false;
  try {
    // A null getContext means the attributes don't match the live one, not
    // that the picture died. Only isContextLost is a real loss.
    const gl = el.getContext("webgl2") || el.getContext("webgl");
    if (!gl || typeof gl.isContextLost !== "function") return false;
    return gl.isContextLost();
  } catch {
    return false;
  }
}

/** Apple / modest GPU land gap. Locked at 48ms — do not restore 160ms. */
const SCENE_GATE_MS = 48;

function SceneGate({ charted }: { charted: boolean }) {
  const { camera } = useThree();
  const [view, setView] = useState<"gap" | "galaxy" | "chart">(charted ? "chart" : "galaxy");
  const shown = useRef(charted);
  const [NatalWheel, setNatalWheel] = useState<ComponentType | null>(null);

  // Orbit and the natal starfield live in ChartWorld. Fetch that file when a
  // chart is opening so it is not part of the corridor download.
  useLayoutEffect(() => {
    if (!charted) return;
    let live = true;
    void import("./ChartWorld").then((m) => {
      if (live) setNatalWheel(() => m.ChartWorld);
    });
    return () => {
      live = false;
    };
  }, [charted]);

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
      {view === "chart" && NatalWheel ? (
        <NatalWheel />
      ) : view === "galaxy" ? (
        <GalaxyIntro />
      ) : null}
    </>
  );
}

export function ChartCanvas() {
  const entered = useIsEntered();
  const sessionKind = useSessionKind();
  const nativity = useNativity();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event(SKY_READY_EVENT));
    }, 2000);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    const onLost = (e: Event) => {
      const canvas = document.querySelector(".canvas-root canvas");
      if (e.target !== canvas) return;
      acknowledgeContextLost(e);
    };
    const onShow = () => {
      if (document.visibilityState === "hidden") return;
      const canvas = document.querySelector(".canvas-root canvas") as HTMLCanvasElement | null;
      if (contextLost(canvas)) acknowledgeContextLost(new Event("webglcontextlost"), canvas);
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
          zIndex: 0,
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
            el.tabIndex = -1;
            el.setAttribute("aria-hidden", "true");
            el.dataset.glAlive = "1";
            el.style.background = "#0c0b0a";
            el.addEventListener(
              "webglcontextlost",
              (ev) => {
                acknowledgeContextLost(ev);
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
