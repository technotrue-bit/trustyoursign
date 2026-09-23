#!/usr/bin/env node
/**
 * One-off (re-runnable) re-encode of the Aries dwell clip.
 *
 * The clip is rendered onto the same plate quad as the still art, which is
 * never drawn larger than 1024×576 (`canvasSize()` in signArt.ts — 512×288 on
 * a small/software GPU). The source was 1280×720 at ~5.7 Mbps — more
 * resolution and bitrate than the mesh can ever show. Re-encoding at the
 * actual max display size with a quality-tuned CRF cuts bytes by ~73% with
 * no visible difference (verified: SSIM ≈ 0.994 against the original at
 * matching resolution — nearly identical to SSIM between two different CRF
 * candidates of the same source — plus side-by-side frame inspection,
 * including the pure-black background the mesh's additive blending depends
 * on staying clean).
 *
 * Run again if the source clip is ever replaced:
 *   node scripts/optimize-dwell-clip.mjs <input.mp4> <output.mp4>
 */
import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";

const [, , inputArg, outputArg] = process.argv;
const input = inputArg ?? "public/signs/aries-life.mp4";
const output = outputArg ?? input;

async function main() {
  const before = (await stat(input)).size;
  const tmp = `${output}.tmp.mp4`;
  const args = [
    "-y",
    "-v",
    "error",
    "-i",
    input,
    "-vf",
    "scale=1024:576:flags=lanczos",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "23",
    "-profile:v",
    "main",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    tmp,
  ];
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${result.status}`);
  }
  const { rename } = await import("node:fs/promises");
  await rename(tmp, output);
  const after = (await stat(output)).size;
  console.log(
    `${input} -> ${output}  ${(before / 1024 / 1024).toFixed(2)}MiB -> ${(after / 1024 / 1024).toFixed(2)}MiB`,
  );
}

await main();
