import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, PerspectiveCamera, type ShaderMaterial } from "three";
import {
  ARM_N_FULL,
  ARM_N_LOD,
  GALAXY_ORIGIN,
  GALAXY_TILT,
  buildGalaxy,
  makeGalaxyMaterial,
  makeHazeSprite,
  makeStarSprite,
} from "@/lib/galaxy/celestial";
import { introArms, introBulge, introField, introHaze, introPlaying } from "@/lib/galaxy/intro";
import { buildNearSky, makeNearSkyMaterial } from "@/lib/galaxy/nearSky";
import { TEMPLE_STATIONS, stationFromT } from "@/lib/galaxy/temple";
import { galaxyTravel } from "@/lib/galaxy/travel";

function noopRaycast() {
  /* sky never steals picks */
}

export function CelestialSky() {
  const { camera } = useThree();
  const group = useRef<import("three").Group>(null);
  const hazeMesh = useRef<import("three").Mesh>(null);
  const discMesh = useRef<import("three").Mesh>(null);
  const bulgePts = useRef<import("three").Points>(null);
  const armPts = useRef<import("three").Points>(null);
  const fieldPts = useRef<import("three").Points>(null);
  const nearPts = useRef<import("three").Points>(null);
  const tex = useMemo(() => makeStarSprite(), []);
  const haze = useMemo(() => makeHazeSprite(), []);
  const layers = useMemo(() => buildGalaxy(), []);
  const nearGeo = useMemo(() => buildNearSky(), []);
  const matBulge = useMemo(() => makeGalaxyMaterial(tex, 0.95), [tex]);
  const matArms = useMemo(() => makeGalaxyMaterial(tex, 0.78), [tex]);
  const matField = useMemo(() => makeGalaxyMaterial(tex, 0.7), [tex]);
  const matNear = useMemo(() => makeNearSkyMaterial(tex, 0.48), [tex]);
  const mats = useRef<ShaderMaterial[]>([]);
  mats.current = [matBulge, matArms, matField, matNear];

  useEffect(() => {
    const pin = () => {
      if (camera instanceof PerspectiveCamera) {
        camera.far = 2500;
        camera.updateProjectionMatrix();
      }
    };
    pin();
    return () => {
      tex.dispose();
      haze.dispose();
      layers.bulge.dispose();
      layers.arms.dispose();
      layers.field.dispose();
      nearGeo.dispose();
      matBulge.dispose();
      matArms.dispose();
      matField.dispose();
      matNear.dispose();
    };
  }, [camera, tex, haze, layers, nearGeo, matBulge, matArms, matField, matNear]);

  useFrame(({ clock }) => {
    if (camera instanceof PerspectiveCamera && camera.far !== 2500) {
      camera.far = 2500;
      camera.updateProjectionMatrix();
    }
    const t = clock.elapsedTime;
    for (const m of mats.current) m.uniforms.uTime.value = t;
    const field = introField();
    const haze = introHaze();
    const bulge = introBulge();
    const arms = introArms();
    const birth = introPlaying();
    matField.uniforms.uOpacity.value = 0.7 * field;
    matNear.uniforms.uOpacity.value = 0.5 * field;
    matBulge.uniforms.uOpacity.value = 0.95 * bulge;
    matArms.uniforms.uOpacity.value = 0.78 * arms;
    // LOD after intro: thinner arms; merge near into field budget by hiding near (A3).
    const armDraw = birth ? ARM_N_FULL : ARM_N_LOD;
    layers.arms.setDrawRange(0, armDraw);
    if (fieldPts.current) fieldPts.current.visible = field > 0.02;
    if (nearPts.current) {
      // During birth keep near accents; post-intro field covers the role (merged budget).
      nearPts.current.visible = birth && field > 0.02;
      if (nearPts.current.visible) {
        const sit = TEMPLE_STATIONS[stationFromT(galaxyTravel.t)] ?? TEMPLE_STATIONS[0]!;
        nearPts.current.position.lerp(sit, 0.07);
      }
    }
    if (bulgePts.current) {
      bulgePts.current.visible = bulge > 0.02;
      const s = 0.72 + bulge * 0.28;
      bulgePts.current.scale.setScalar(s);
    }
    if (armPts.current) {
      armPts.current.visible = arms > 0.02;
      const s = 0.78 + arms * 0.22;
      armPts.current.scale.setScalar(s);
    }
    if (hazeMesh.current) {
      const mat = hazeMesh.current.material as import("three").MeshBasicMaterial;
      mat.opacity = 0.1 * haze;
      hazeMesh.current.visible = haze > 0.02;
      const hs = 180 + haze * 40;
      hazeMesh.current.scale.set(hs, hs, 1);
    }
    if (discMesh.current) {
      discMesh.current.visible = false;
    }
  });

  return (
    <>
      <group ref={group} position={[GALAXY_ORIGIN.x, GALAXY_ORIGIN.y, GALAXY_ORIGIN.z]} rotation={[GALAXY_TILT, 0, 0]}>
        <mesh ref={discMesh} visible={false} renderOrder={-3} raycast={noopRaycast}>
          <circleGeometry args={[96, 40]} />
          <meshBasicMaterial
            color="#1c1612"
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
        <mesh ref={hazeMesh} renderOrder={-2} raycast={noopRaycast} scale={[220, 220, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={haze}
            color="#f0e6d0"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest
            blending={AdditiveBlending}
            fog={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
        <points ref={bulgePts} geometry={layers.bulge} material={matBulge} frustumCulled={false} renderOrder={-1} raycast={noopRaycast} />
        <points ref={armPts} geometry={layers.arms} material={matArms} frustumCulled={false} renderOrder={-1} raycast={noopRaycast} />
      </group>
      <points ref={fieldPts} geometry={layers.field} material={matField} frustumCulled={false} renderOrder={-4} raycast={noopRaycast} />
      <points
        ref={nearPts}
        geometry={nearGeo}
        material={matNear}
        position={[TEMPLE_STATIONS[0]!.x, TEMPLE_STATIONS[0]!.y, TEMPLE_STATIONS[0]!.z]}
        frustumCulled={false}
        renderOrder={-6}
        raycast={noopRaycast}
      />
    </>
  );
}
