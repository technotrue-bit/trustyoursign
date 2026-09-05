import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  PointsMaterial,
  Vector3,
} from "three";
import type { SignId } from "@/lib/chart/types";
import { makeStarSprite } from "@/lib/galaxy/celestial";
import { getSignVolume, interiorCloud } from "@/lib/galaxy/signVolume";
import { isSmallGpu } from "@/lib/gpu";

type Props = {
  signId: SignId;
  count?: number;
  /** When set (Vault), scale like the plate: width = plateWide. */
  plateWide?: number;
};

export function SignStarVolume({ signId, count, plateWide }: Props) {
  const centerRef = useRef<Group>(null);
  const small = isSmallGpu();
  const n = count ?? (small ? 1200 : 2800);
  const pts = useMemo(() => interiorCloud(signId, n), [signId, n]);

  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(pts.length * 3);
    const mag = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      mag[i] = p.mag;
    }
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aMag", new BufferAttribute(mag, 1));
    return g;
  }, [pts]);

  const tex = useMemo(() => makeStarSprite(), []);
  const material = useMemo(
    () =>
      new PointsMaterial({
        map: tex,
        color: new Color("#e8d4a8"),
        size: small ? 0.038 : 0.045,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
        toneMapped: false,
      }),
    [small, tex],
  );

  const aspect = getSignVolume(signId)?.aspect ?? 16 / 9;
  const scale: [number, number, number] = plateWide
    ? [plateWide, plateWide / aspect, plateWide]
    : [1, 1, 1];

  useLayoutEffect(() => {
    if (!centerRef.current || !geo || !pts.length) return;
    const box = new Box3().setFromBufferAttribute(
      geo.getAttribute("position") as BufferAttribute,
    );
    const center = new Vector3();
    box.getCenter(center);
    centerRef.current.position.set(-center.x, -center.y, -center.z);
  }, [geo, pts.length, signId]);

  useEffect(() => {
    return () => {
      material.dispose();
      tex.dispose();
    };
  }, [material, tex]);

  useEffect(() => {
    return () => {
      geo.dispose();
    };
  }, [geo]);

  if (!pts.length) return null;

  return (
    <group scale={scale}>
      <group ref={centerRef}>
        <points geometry={geo} material={material} frustumCulled={false} />
      </group>
    </group>
  );
}
