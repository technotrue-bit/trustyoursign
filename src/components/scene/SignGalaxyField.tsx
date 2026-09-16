import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Vector3,
} from "three";
import { getSignGalaxy, GALAXY_SPAN, type SignGalaxy } from "@/lib/galaxy/signGalaxy";
import { galaxyTravel, seekGalaxyPoint } from "@/lib/galaxy/travel";
import { PLATE_WIDE, type TempleSign } from "@/lib/galaxy/temple";
import { STAR_APPEARANCE } from "@/lib/galaxy/starAppearance";

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
  const pointGeo = useMemo(() => buildPointGeo(galaxy), [galaxy]);
  const tint = useMemo(() => new Color(sign.palette.particle), [sign.palette.particle]);
  const accent = useMemo(() => new Color(sign.palette.accent), [sign.palette.accent]);

  useEffect(
    () => () => {
      lineGeo.dispose();
      starGeo.dispose();
      pointGeo.dispose();
    },
    [lineGeo, starGeo, pointGeo],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const exploring =
      galaxyTravel.exploreSignIndex === index && galaxyTravel.explorePhase !== "idle";
    const form = exploring ? galaxyTravel.galaxyForm : 0;
    // Keep the painted plate as the dive hero early; bloom the field as we settle into the hub.
    g.visible = form > 0.12;
    if (!g.visible) return;
    const span = (PLATE_WIDE / GALAXY_SPAN) * (1.05 + form * 0.35);
    g.scale.setScalar(span);
    const lineMat = (g.children[0] as { material?: { opacity?: number; color?: Color } } | undefined)
      ?.material;
    const starMat = (g.children[1] as { material?: { opacity?: number; color?: Color; size?: number } } | undefined)
      ?.material;
    const pointMat = (g.children[2] as { material?: { opacity?: number; color?: Color; size?: number } } | undefined)
      ?.material;
    const fieldReveal = Math.max(0, (form - 0.18) / 0.82);
    if (lineMat) {
      lineMat.opacity = Math.min(1, fieldReveal * STAR_APPEARANCE.fieldLineOpacity);
      if (lineMat.color) lineMat.color.copy(accent);
    }
    if (starMat) {
      starMat.opacity = Math.min(1, fieldReveal * STAR_APPEARANCE.fieldStarOpacity);
      if (starMat.color) starMat.color.copy(tint);
      if (typeof starMat.size === "number") {
        starMat.size = STAR_APPEARANCE.fieldStarSize + form * STAR_APPEARANCE.fieldStarSizeGrowth;
      }
    }
    if (pointMat) {
      pointMat.opacity = Math.min(1, fieldReveal * STAR_APPEARANCE.fieldPointOpacity);
      if (pointMat.color) pointMat.color.copy(accent);
      if (typeof pointMat.size === "number") {
        pointMat.size = STAR_APPEARANCE.fieldPointSize + form * STAR_APPEARANCE.fieldPointSizeGrowth;
      }
    }
  });

  return (
    <group ref={group} visible={false} position={[0, 0.05, 0.35]}>
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
          size={0.3}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </points>
      <points geometry={pointGeo} frustumCulled={false} raycast={noopRaycast}>
        <pointsMaterial
          color={sign.palette.accent}
          size={0.7}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
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
          <sphereGeometry args={[p.isHub ? 0.72 : 0.52, 16, 14]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
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

function buildPointGeo(galaxy: SignGalaxy) {
  const g = new BufferGeometry();
  const pos = new Float32Array(galaxy.points.length * 3);
  for (let i = 0; i < galaxy.points.length; i++) {
    const p = galaxy.points[i]!;
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
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

/** Station-local offset for the active travel point (nodes live inside the galaxy volume). */
export function pointLocalOffset(galaxy: SignGalaxy, pointIndex: number, form: number) {
  const p = galaxy.points[pointIndex] ?? galaxy.points[0];
  if (!p) return new Vector3(0, 0, 0);
  const span = (PLATE_WIDE / GALAXY_SPAN) * (1.05 + form * 0.35);
  // Dampen XY so default framing keeps neighbors + lines in view; zoom pushes in from here.
  // Soft Z still tracks portal depth without sticking the camera to a single junction.
  const xy = 0.7;
  return new Vector3(p.x * span * xy, p.y * span * xy + 0.04, p.z * span * 0.48 + 0.55 * form);
}
