export const PLANET_LOOK: Record<PlanetId, { color: string; glow: string; size: number; radius: number }> =
  PLANETS.reduce(
    (acc, p) => {
      acc[p.id] = { color: p.color, glow: p.glow, size: p.size, radius: p.radius };
      return acc;
    },
    {} as Record<PlanetId, { color: string; glow: string; size: number; radius: number }>,
  );
