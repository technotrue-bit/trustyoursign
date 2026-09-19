import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import {
  EXPLORE_LOOK_MAX_X,
  EXPLORE_LOOK_MAX_Y,
} from "./travel.ts";
import {
  EXPLORE_LOOK_RIGHT,
  EXPLORE_LOOK_UP,
  offsetExploreLookPose,
} from "./exploreLookPose.ts";

const HUB_STANDOFF = 2.6;
const LIFT = 0.28;

function parkPose() {
  const cam = new Vector3(0, 0, HUB_STANDOFF);
  const look = new Vector3(0, -LIFT, 0);
  return { cam, look };
}

/**
 * Simulate N frames of inside-sign look application the way GalaxyIntro used to:
 * derive right/up from the live camera quaternion (already lookAt'd last frame),
 * soft-lerp position, snap lookAt. Returns look.x samples.
 */
function simulateLookFrames(opts: {
  frames: number;
  lookX: number;
  lookY: number;
  /** true = old buggy live-quat basis; false = stable world axes */
  liveQuatBasis: boolean;
  /** soft lerp ease per frame (old explore path ~0.025 at 60fps) */
  ease: number;
}) {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, HUB_STANDOFF);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, -LIFT, 0);

  const samples: number[] = [];
  const right = new Vector3();
  const up = new Vector3();

  for (let i = 0; i < opts.frames; i++) {
    const { cam, look } = parkPose();
    if (opts.liveQuatBasis) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    } else {
      right.copy(EXPLORE_LOOK_RIGHT);
      up.copy(EXPLORE_LOOK_UP);
    }
    offsetExploreLookPose(cam, look, opts.lookX, opts.lookY, right, up);
    if (opts.ease >= 1) {
      camera.position.copy(cam);
    } else {
      camera.position.lerp(cam, opts.ease);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    samples.push(look.x);
  }
  return samples;
}

function peakToPeak(samples: number[]) {
  return Math.max(...samples) - Math.min(...samples);
}

describe("explore look pose basis", () => {
  it("stable basis keeps a constant look target when look offsets are held", () => {
    const samples = simulateLookFrames({
      frames: 40,
      lookX: EXPLORE_LOOK_MAX_X,
      lookY: EXPLORE_LOOK_MAX_Y * 0.6,
      liveQuatBasis: false,
      ease: 1,
    });
    assert.ok(
      peakToPeak(samples) < 1e-9,
      `stable basis must not drift look.x; range=${peakToPeak(samples)} samples=${samples.slice(0, 5)}`,
    );
  });

  it("live quaternion basis oscillates at max look (the jitter regression)", () => {
    const samples = simulateLookFrames({
      frames: 40,
      lookX: EXPLORE_LOOK_MAX_X,
      lookY: 2,
      liveQuatBasis: true,
      // Match the soft explore ease that magnified cam/look disagreement.
      ease: 1 - Math.exp(-1 / 60 * 1.6),
    });
    const range = peakToPeak(samples);
    assert.ok(
      range > 0.5,
      `expected live-quat feedback to swing look.x hard at clamp; range=${range}`,
    );
  });

  it("offsetExploreLookPose looks right for positive lookX", () => {
    const { cam, look } = parkPose();
    offsetExploreLookPose(cam, look, 2, 0);
    assert.ok(look.x < 0, "look target moves left of hub so camera looks right");
    assert.ok(cam.x < 0, "camera rides with the look");
  });
});
