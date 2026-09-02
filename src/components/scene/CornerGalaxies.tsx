import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, PerspectiveCamera } from "three";
import { galaxyTravel } from "@/lib/galaxy/travel";
import { introPlaying, introChrome } from "@/lib/galaxy/intro";
import { stationFromT } from "@/lib/galaxy/temple";
import { buildCornerGalaxies, makeCornerMaterial, paletteForSign } from "@/lib/galaxy/corners";

function noopRaycast() {
  /* corners never steal picks */
}

function copyPal(src: Color[], dst: Color[]) {
  for (let i = 0; i < 4; i++) dst[i]!.copy(src[i]!);
}

export function CornerGalaxies() {
  const { camera, gl } = useThree();
  const ref = useRef<import("three").Points>(null);
  const geo = useMemo(() => buildCornerGalaxies(), []);
  const mat = useMemo(() => makeCornerMaterial(), []);
  const sign = useRef(0);
  const mixFrom = useRef(-10);
  const fromA = useMemo(() => paletteForSign(0).a, []);
  const fromB = useMemo(() => paletteForSign(0).b, []);

  useEffect(() => {
    const pal = paletteForSign(0);
    copyPal(pal.a, mat.uniforms.uColorA.value);
    copyPal(pal.b, mat.uniforms.uColorB.value);
    copyPal(pal.a, fromA);
    copyPal(pal.b, fromB);
    mat.uniforms.uMix.value = 1;
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat, fromA, fromB]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.position.copy(camera.position);
    mesh.quaternion.copy(camera.quaternion);
    if (camera instanceof PerspectiveCamera) {
      const z = 16.8;
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * z;
      const halfW = halfH * Math.max(0.36, camera.aspect);
      mesh.scale.set(Math.max(0.22, (halfW * 0.84) / 11.6), Math.max(0.22, (halfH * 0.84) / 6.35), 1);
    }

    const i = stationFromT(galaxyTravel.t);
    if (i !== sign.current) {
      copyPal(mat.uniforms.uColorA.value, fromA);
      copyPal(mat.uniforms.uColorB.value, fromB);
      sign.current = i;
      mixFrom.current = clock.elapsedTime;
    }
    const pal = paletteForSign(sign.current);
    const u = Math.min(1, Math.max(0, (clock.elapsedTime - mixFrom.current) / 0.4));
    const e = u * u * u * (u * (u * 6 - 15) + 10);
    const aArr = mat.uniforms.uColorA.value as Color[];
    const bArr = mat.uniforms.uColorB.value as Color[];
    for (let k = 0; k < 4; k++) {
      aArr[k]!.copy(fromA[k]!).lerp(pal.a[k]!, e);
      bArr[k]!.copy(fromB[k]!).lerp(pal.b[k]!, e);
    }
    mat.uniforms.uMix.value = e;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    const vis = introPlaying() ? introChrome() : 1;
    const fade = mat.uniforms.uFade.value as number[];
    fade[0] = vis;
    fade[1] = vis;
    fade[2] = vis;
    fade[3] = vis;
    mat.uniforms.uMaxSize.value = 9;
  });

  return (
    <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-8} raycast={noopRaycast} />
  );
}
