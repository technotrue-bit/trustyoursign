import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { getSignGalaxy, GALAXY_SPAN, type SignGalaxy } from "@/lib/galaxy/signGalaxy";
import {
  CORE_LOCAL_SIZE,
  coreOpacity,
  coreSpin,
  coreSwell,
  getSignCore,
} from "@/lib/galaxy/signCore";
import { starSpikeSprite, starSprite } from "@/lib/galaxy/starSprite";
import { galaxyTravel, seekGalaxyPoint } from "@/lib/galaxy/travel";
import { PLATE_WIDE, type TempleSign } from "@/lib/galaxy/temple";

function noopRaycast() {
  /* ambient field never steals picks */
}

/**
 * Animal-figure galaxy that blooms as the camera dives into a selected sign.
 *
 * Three pieces, in the order the eye reads them: the connector lines (plus a
 * faint halo pass so they glow), the figure's stars and travel nodes as round
 * sprites, and the galaxy core at the hub — the light source you land on.
 * Travel points sit on major animal stars and stay clickable once inside.
 */
export function SignGalaxyField({
  sign,
  index,
}: {
  sign: TempleSign;
  index: number;
}) {
  const group = useRef<Group>(null);
  const haloGroup = useRef<Group>(null);
  const coreRef = useRef<Sprite>(null);
  const coreMat = useRef<SpriteMaterial>(null);
  const glowMat = useRef<LineBasicMaterial>(null);
  const lineMat = useRef<LineBasicMaterial>(null);
  const starMat = useRef<PointsMaterial>(null);
  const pointMat = useRef<PointsMaterial>(null);

  const galaxy = useMemo(() => getSignGalaxy(sign.id), [sign.id]);
  const lineGeo = useMemo(() => buildLineGeo(galaxy), [galaxy]);
  const starGeo = useMemo(() => buildStarGeo(galaxy), [galaxy]);
  const pointGeo = useMemo(() => buildPointGeo(galaxy), [galaxy]);
  const coreTex = useMemo(() => getSignCore(sign.id), [sign.id]);
  const tint = useMemo(() => new Color(sign.palette.particle), [sign.palette.particle]);
  const accent = useMemo(() => new Color(sign.palette.accent), [sign.palette.accent]);
  const softStar = useMemo(() => starSprite(), []);
  const brightStar = useMemo(() => starSpikeSprite(), []);
  const hub = galaxy.points[0];

  useEffect(
    () => () => {
      lineGeo.dispose();
      starGeo.dispose();
      pointGeo.dispose();
    },
    [lineGeo, starGeo, pointGeo],
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const exploring =
      galaxyTravel.exploreSignIndex === index && galaxyTravel.explorePhase !== "idle";
    const inside = exploring && galaxyTravel.explorePhase === "inside";
    const form = exploring ? galaxyTravel.galaxyForm : 0;
    // Keep the painted plate as the dive hero early; bloom the field as we settle into the hub.
    g.visible = form > 0.12 || inside;
    if (!g.visible) return;
    const span = (PLATE_WIDE / GALAXY_SPAN) * (1.05 + form * 0.35);
    g.scale.setScalar(span);
    if (haloGroup.current) haloGroup.current.scale.setScalar(1.018 + form * 0.006);

    const fieldReveal = Math.max(0, (form - 0.18) / 0.82);
    // Inside, the figure stays lit: it is the room, not scenery flown past.
    const lit = inside ? 1 : fieldReveal;
    if (lineMat.current) lineMat.current.opacity = Math.min(1, lit * (inside ? 0.72 : 0.85));
    if (glowMat.current) glowMat.current.opacity = Math.min(1, lit * (inside ? 0.3 : 0.34));
    if (starMat.current) {
      starMat.current.opacity = Math.min(1, lit * 0.95);
      starMat.current.color.copy(tint);
      starMat.current.size = (inside ? 0.34 : 0.28) + form * 0.12;
    }
    if (pointMat.current) {
      pointMat.current.opacity = Math.min(1, lit * 1.05);
      pointMat.current.color.copy(accent);
      pointMat.current.size = (inside ? 0.46 : 0.38) + form * 0.12;
    }

    const core = coreRef.current;
    if (core && coreMat.current) {
      const reveal = exploring ? galaxyTravel.coreReveal : 0;
      const show = reveal > 0.004 || inside;
      core.visible = show;
      if (show) {
        core.scale.setScalar(CORE_LOCAL_SIZE * (inside ? 1 : coreSwell(reveal)));
        coreMat.current.opacity = coreOpacity(reveal, inside);
        coreMat.current.rotation = coreSpin(state.clock.elapsedTime, inside);
      }
    }
  });

  useEffect(
    () => () => {
      coreMat.current?.dispose();
    },
    [],
  );

  return (
    <group ref={group} visible={false} position={[0, 0.05, 0.35]}>
      <group ref={haloGroup}>
        <lineSegments geometry={lineGeo} frustumCulled={false} raycast={noopRaycast}>
          <lineBasicMaterial
            ref={glowMat}
            color={sign.palette.accent}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            blending={AdditiveBlending}
          />
        </lineSegments>
      </group>
      <lineSegments geometry={lineGeo} frustumCulled={false} raycast={noopRaycast}>
        <lineBasicMaterial
          ref={lineMat}
          color={sign.palette.chest}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
      <points geometry={starGeo} frustumCulled={false} raycast={noopRaycast}>
        <pointsMaterial
          ref={starMat}
          map={softStar}
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
          ref={pointMat}
          map={brightStar}
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
      {coreTex && hub ? (
        <sprite
          ref={coreRef}
          renderOrder={6}
          position={[hub.x, hub.y, hub.z]}
          visible={false}
          raycast={noopRaycast}
        >
          <spriteMaterial
            ref={coreMat}
            map={coreTex}
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            blending={AdditiveBlending}
          />
        </sprite>
      ) : null}
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
  // Stronger Z so the camera enters the portal and moves between interior nodes,
  // not along the flat plate face.
  return new Vector3(p.x * span, p.y * span + 0.05, p.z * span * 0.62 + 0.85 * form);
}
