import { Vector3 } from "three";

/**
 * Parked hub pose faces nearly −Z with world up. Explore look offsets are applied
 * in these **stable** screen axes — never from the live `camera.quaternion`.
 *
 * Using the live quaternion feeds last frame's lookAt back into this frame's
 * offset basis, which oscillates hard once look hits the clamp extremes.
 */
export const EXPLORE_LOOK_RIGHT = Object.freeze(new Vector3(1, 0, 0));
export const EXPLORE_LOOK_UP = Object.freeze(new Vector3(0, 1, 0));

/** How far the camera rides along the look offset (keeps parallax with the aim). */
export const EXPLORE_LOOK_CAM_X = 0.72;
export const EXPLORE_LOOK_CAM_Y = 0.68;

/**
 * Offset a parked hub cam/look by explore look units.
 * Positive lookX looks right; positive lookY looks up.
 */
export function offsetExploreLookPose(
  cam: Vector3,
  look: Vector3,
  lookX: number,
  lookY: number,
  right: Vector3 = EXPLORE_LOOK_RIGHT,
  up: Vector3 = EXPLORE_LOOK_UP,
) {
  if (lookX === 0 && lookY === 0) return;
  // Positive lookX is look-right; drag-right and D agree.
  look.addScaledVector(right, -lookX);
  look.addScaledVector(up, lookY);
  cam.addScaledVector(right, -lookX * EXPLORE_LOOK_CAM_X);
  cam.addScaledVector(up, lookY * EXPLORE_LOOK_CAM_Y);
}
