import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Vector3,
} from "three";
import { getSignGalaxy, GALAXY_SPAN, type SignGalaxy } from "@/lib/galaxy/signGalaxy";
import { galaxyTravel, seekGalaxyPoint } from "@/lib/galaxy/travel";
import { PLATE_WIDE, type TempleSign } from "@/lib/galaxy/temple";

function noopRaycast() {
  /* ambient field never steals picks */
}

/**
 * Animal-figure galaxy that blooms as the camera dives into a selected sign.
 * Travel points sit on major animal stars and remain clickable once inside.
 */
export function SignGalaxyField({
  sign,
  index,
}: {
  sign: TempleSign;
  index: number;
}) {
  const group = useRef<Group>(null);
  const galaxy = useMemo(() => getSignGalaxy(sign.id), [sign.id]);
  const lineGeo = useMemo(() => buildLineGeo(galaxy), [galaxy]);
  const starGeo = useMemo(() => buildStarGeo(galaxy), [galaxy]);
  const tint = useMemo(() => new Color(sign.palette.particle), [sign.palette.particle]);

  useEffect(
    () => () => {
      lineGeo.dispose();
      starGeo.dispose();
    },
    [lineGeo, starGeo],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const exploring =
      galaxyTravel.exploreSignIndex === index && galaxyTravel.explorePhase !== "idle";
    const form = exploring ? galaxyTravel.galaxyForm : 0;
    g.visible = form > 0.02;
    if (!g.visible) return;
    const span = (PLATE_WIDE / GALAXY_SPAN) * (0.92 + form * 0.55);
    g.scale.setScalar(span);
    g.traverse((obj) => {
      const mat = (obj as { material?: { opacity?: number; color?: Color } }).material;
      if (!mat || typeof mat.opacity !== "number") return;
      mat.opacity = Math.min(1, form * 1.15);
      if (mat.color) mat.color.copy(tint);
    });
  });

  return (
    <group ref={group} visible={false} position={[0, 0.05, 0.2]}>
      <lineSegments geometry={lineGeo} frustumCulled={false} raycast={noopRaycast}>
        <lineBasicMaterial
          color={sign.palette.accent}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
      <points geometry={starGeo} frustumCulled={false} raycast={noopRaycast}>
        <pointsMaterial
          color={sign.palette.chest}
          size={0.22}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      {galaxy.points.map((p, pi) => (
        <mesh
          key={p.id}
          position={[p.x, p.y, p.z]}
          onClick={(e) => {
            e.stopPropagation();
            if (galaxyTravel.explorePhase !== "inside") return;
            seekGalaxyPoint(pi);
          }}
        >
          <sphereGeometry args={[p.isHub ? 0.55 : 0.38, 12, 10]} />
          <meshBasicMaterial
            color={p.isHub ? sign.palette.accent : sign.palette.particle}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function buildStarGeo(galaxy: SignGalaxy) {
  const g = new BufferGeometry();
  const pos = new Float32Array(galaxy.stars.length * 3);
  for (let i = 0; i < galaxy.stars.length; i++) {
    const s = galaxy.stars[i]!;
    pos[i * 3] = s.x;
    pos[i * 3 + 1] = s.y;
    pos[i * 3 + 2] = s.z;
  }
  g.setAttribute("position", new BufferAttribute(pos, 3));
  return g;
}

function buildLineGeo(galaxy: SignGalaxy) {
  const g = new BufferGeometry();
  const pos = new Float32Array(galaxy.lines.length * 6);
  let w = 0;
  for (const [a, b] of galaxy.lines) {
    const sa = galaxy.stars[a];
    const sb = galaxy.stars[b];
    if (!sa || !sb) continue;
    pos[w++] = sa.x;
    pos[w++] = sa.y;
    pos[w++] = sa.z;
    pos[w++] = sb.x;
    pos[w++] = sb.y;
    pos[w++] = sb.z;
  }
  g.setAttribute("position", new BufferAttribute(pos.subarray(0, w), 3));
  return g;
}

/** Station-local offset for the active travel point. */
export function pointLocalOffset(galaxy: SignGalaxy, pointIndex: number, form: number) {
  const p = galaxy.points[pointIndex] ?? galaxy.points[0];
  if (!p) return new Vector3(0, 0, 0);
  const span = (PLATE_WIDE / GALAXY_SPAN) * (0.92 + form * 0.55);
  return new Vector3(p.x * span, p.y * span + 0.05, p.z * span + 0.2);
}
