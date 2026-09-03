/**
 * Pure math helpers for the BirthChat sign-slide animation.
 *
 * Camera-space offset (right on desktop, up on phone), arrival-gated,
 * clamped so the plate stays in the frustum. Testable without WebGL.
 */

export const ARRIVED_T = 0.02;
export const DESIRED_NDC = 0.35;
export const VIEW_MARGIN = 0.92;
export const PICKED_SCALE = 1.4;
export const SOFT_SCALE = 1.1;
export const PHONE_MAX_WIDTH = 768;

export function lerpToward({
  current,
  target,
  dt,
  rate,
}: {
  current: number;
  target: number;
  dt: number;
  rate: number;
}): number {
  const k = Math.min(1, Math.min(dt, 0.1) * rate);
  return current + (target - current) * k;
}

export function computePlateOpacity({
  plateOn,
  held,
  focused,
  fade,
  bornIn,
}: {
  plateOn: boolean;
  held: boolean;
  focused: boolean;
  fade: number;
  bornIn: number;
  morphLevel: number;
}): number {
  if (!plateOn) return 0;
  return (held || focused ? 1 : 0.7) * Math.max(fade, 0.35) * bornIn;
}

function plateHalves(plateWide: number, plateAspect: number, scale: number) {
  return {
    x: (plateWide / 2) * scale,
    y: (plateWide / plateAspect / 2) * scale,
  };
}

function scaleFits(
  desiredNdcX: number,
  desiredNdcY: number,
  halfW: number,
  halfH: number,
  plateWide: number,
  plateAspect: number,
  scale: number,
): boolean {
  const h = plateHalves(plateWide, plateAspect, scale);
  return (
    Math.abs(desiredNdcX) * halfW + h.x <= halfW * VIEW_MARGIN &&
    Math.abs(desiredNdcY) * halfH + h.y <= halfH * VIEW_MARGIN
  );
}

export function computeBirthChatSlide({
  picked,
  travelT,
  stationT,
  fov,
  sitCameraZ,
  aspect,
  cssWidth,
  plateWide,
  plateAspect,
  currentScale,
}: {
  picked: boolean;
  travelT: number;
  stationT: number;
  fov: number;
  sitCameraZ: number;
  aspect: number;
  cssWidth: number;
  plateWide: number;
  plateAspect: number;
  currentScale: number;
}): { offsetX: number; offsetY: number; targetScale: number } {
  if (!picked) return { offsetX: 0, offsetY: 0, targetScale: 1 };

  const portraitSheet = cssWidth < PHONE_MAX_WIDTH;
  const desiredNdcX = portraitSheet ? 0 : DESIRED_NDC;
  const desiredNdcY = portraitSheet ? DESIRED_NDC : 0;

  const depth = Math.abs(sitCameraZ);
  const halfH = depth < 1e-3 ? 0 : Math.tan((fov * Math.PI) / 360) * depth;
  const halfW = halfH * aspect;

  const targetScale =
    halfW > 0 && halfH > 0 && scaleFits(desiredNdcX, desiredNdcY, halfW, halfH, plateWide, plateAspect, PICKED_SCALE)
      ? PICKED_SCALE
      : SOFT_SCALE;

  const arrived = Math.abs(travelT - stationT) <= ARRIVED_T;
  if (!arrived || depth < 1e-3 || halfW <= 0 || halfH <= 0) {
    return { offsetX: 0, offsetY: 0, targetScale };
  }

  const rawX = desiredNdcX * halfW;
  const rawY = desiredNdcY * halfH;
  const at = plateHalves(plateWide, plateAspect, currentScale);
  const maxX = Math.max(0, halfW * VIEW_MARGIN - at.x);
  const maxY = Math.max(0, halfH * VIEW_MARGIN - at.y);
  const offsetX = Math.min(maxX, Math.max(-maxX, rawX));
  const offsetY = Math.min(maxY, Math.max(-maxY, rawY));
  return { offsetX, offsetY, targetScale };
}
