import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Box3, BufferAttribute, Color, Vector3 } from "three";
import { canvasDpr, glContextAttrs, isSmallGpu } from "@/lib/gpu";
import { SignShell } from "./SignShell";
import { SignStarVolume } from "./SignStarVolume";
import { buildShellGeometry } from "@/lib/galaxy/signVolume";
import type { SignId } from "@/lib/chart/types";

const REVIEW_SIGN: SignId = "sagittarius";
const FIT_HEIGHT = 3.55;
/** Camera cannot dive closer than this to the origin — stay near the mesh. */
const DIVE_MIN_RADIUS = 0.9;
/** Camera cannot pull the dive further than this from the origin. */
const DIVE_MAX_RADIUS = 6;

/**
 * Mirrors SignShell's own unscaled-geometry fit so SignStarVolume (unit-scale
 * without `plateWide`) lines up with the shell's fitted size. Both read the
 * same cached sign-volume data, so this stays in sync with SignShell's
 * internal scale without duplicating its geometry build logic.
 */
function useSharedFitScale(signId: SignId, fitHeight: number) {
  return useMemo(() => {
    const geo = buildShellGeometry(signId);
    if (!geo) return 1;
    const posAttr = geo.getAttribute("position") as BufferAttribute;
    const box = new Box3().setFromBufferAttribute(posAttr);
    const size = new Vector3();
    box.getSize(size);
    const tall = Math.max(size.x, size.y, size.z, 0.001);
    geo.dispose();
    return fitHeight / tall;
  }, [signId, fitHeight]);
}

/**
 * W / ArrowUp / Space (hold) or scroll dives the camera along its own view
 * forward vector. Clamped to a ~6-unit radius from the origin so the rig
 * can't fly off past the mesh. OrbitControls keeps working — this only
 * translates the camera and its controls target together.
 */
function DiveRig({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const keys = useRef({ fwd: false });
  const wheelDelta = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") {
        keys.current.fwd = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") {
        keys.current.fwd = false;
      }
    };
    const wheel = (e: WheelEvent) => {
      wheelDelta.current += -e.deltaY * 0.0016;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("wheel", wheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("wheel", wheel);
    };
  }, []);

  useFrame((_state, dt) => {
    const holdAmount = keys.current.fwd ? dt * 1.8 : 0;
    const wheelAmount = wheelDelta.current;
    wheelDelta.current = 0;
    const amount = holdAmount + wheelAmount;
    if (amount === 0) return;

    const dir = new Vector3();
    camera.getWorldDirection(dir);
    const nextPos = camera.position.clone().addScaledVector(dir, amount);
    const radius = nextPos.length();
    if (radius > DIVE_MAX_RADIUS) {
      nextPos.setLength(DIVE_MAX_RADIUS);
    } else if (radius < DIVE_MIN_RADIUS) {
      nextPos.setLength(DIVE_MIN_RADIUS);
    }

    const moved = nextPos.clone().sub(camera.position);
    camera.position.copy(nextPos);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.add(moved);
      controls.update();
    }
  });

  return null;
}

/**
 * Isolated orbit + dive stage for judging Sagittarius volume vs thin-gold plates.
 * Open via `/?mesh=sagittarius` — does not touch the Vault plate pipeline.
 */
export function MeshReviewCanvas() {
  const [ready, setReady] = useState(false);
  const small = isSmallGpu();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const fitScale = useSharedFitScale(REVIEW_SIGN, FIT_HEIGHT);

  return (
    <div className="canvas-root absolute inset-0">
      <Canvas
        flat
        fallback={null}
        style={{
          background: "#050403",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
        camera={{ position: [2.6, 0.55, 4.2], fov: 42, near: 0.05, far: 200 }}
        dpr={canvasDpr()}
        gl={glContextAttrs()}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(new Color("#050403"), 1);
          camera.lookAt(0, 0.05, 0);
          setReady(true);
        }}
      >
        <color attach="background" args={["#050403"]} />
        <ambientLight intensity={0.28} color="#c8b8a0" />
        <hemisphereLight args={["#2a2430", "#080706", 0.45]} />
        <directionalLight position={[4.5, 6.2, 3.2]} intensity={1.35} color="#fff2dd" />
        <directionalLight position={[-3.8, 1.4, -2.6]} intensity={0.55} color="#8a9ad4" />
        <pointLight position={[0.4, 1.2, 2.4]} intensity={1.8} distance={14} color="#e8c49a" />
        <Stars
          radius={60}
          depth={28}
          count={small ? 280 : 900}
          factor={2.4}
          saturation={0}
          fade
          speed={0.2}
        />
        <Suspense fallback={null}>
          <SignShell signId={REVIEW_SIGN} fitHeight={FIT_HEIGHT} />
          <group scale={[fitScale, fitScale, fitScale]}>
            <SignStarVolume signId={REVIEW_SIGN} />
          </group>
        </Suspense>
        <ContactShadows
          position={[0, -1.85, 0]}
          opacity={0.45}
          scale={8}
          blur={2.4}
          far={4}
          color="#000000"
        />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          minDistance={2.2}
          maxDistance={12}
          target={[0, 0.05, 0]}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI * 0.58}
          autoRotate
          autoRotateSpeed={0.55}
        />
        <DiveRig controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}
