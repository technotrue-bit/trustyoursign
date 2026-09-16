/** Shared visual contract for the layered star renderers. */
export const STAR_APPEARANCE = {
  spriteEdgeInner: 0.205,
  spriteEdgeOuter: 0.25,
  alphaCutoff: 0.002,
  hoverSizeMix: 0.35,
  fieldLineOpacity: 0.85,
  fieldStarOpacity: 0.95,
  fieldPointOpacity: 1.05,
  fieldStarSize: 0.28,
  fieldStarSizeGrowth: 0.12,
  fieldPointSize: 0.38,
  fieldPointSizeGrowth: 0.12,
} as const;

export type StarRenderProfile = {
  stationCount: number;
  dustCount: number;
  galaxyArmCount: number;
  galaxyFieldCount: number;
  stationPixelScale: number;
  stationBaseSize: number;
  fieldStarSize: number;
  fieldPointSize: number;
};

/**
 * Keeps the visual hierarchy intact while reducing fill and vertex pressure on
 * phones, tablets, and software-rendered preview panes.
 */
export function starRenderProfile(smallGpu: boolean): StarRenderProfile {
  if (smallGpu) {
    return {
      stationCount: 2600,
      dustCount: 180,
      galaxyArmCount: 4200,
      galaxyFieldCount: 1400,
      stationPixelScale: 0.9,
      stationBaseSize: 2.6,
      fieldStarSize: 0.25,
      fieldPointSize: 0.34,
    };
  }
  return {
    stationCount: 4400,
    dustCount: 320,
    galaxyArmCount: 8000,
    galaxyFieldCount: 2400,
    stationPixelScale: 1,
    stationBaseSize: 2.05,
    fieldStarSize: 0.28,
    fieldPointSize: 0.38,
  };
}
