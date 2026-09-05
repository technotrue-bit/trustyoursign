import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, Stars } from "@react-three/drei";
import { Color } from "three";
import { canvasDpr, glContextAttrs, isSmallGpu } from "@/lib/gpu";
import { SagittariusMesh } from "./SagittariusMesh";

/**
 * Isolated orbit stage for judging Sagittarius mesh volume vs thin-gold plates.
 * Open via `/?mesh=sagittarius` — does not touch the Vault plate pipeline.
 */
export function MeshReviewCanvas() {
  const [ready, setReady] = useState(false);
  const small = isSmallGpu();

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
          <SagittariusMesh fitHeight={3.55} />
          <Environment preset="night" environmentIntensity={0.55} />
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
      </Canvas>
    </div>
  );
}
