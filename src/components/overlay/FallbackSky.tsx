import { useEffect, useRef } from "react";
import { ASPECT_COLOR } from "@/lib/chart/aspects";
import { lonToXZ } from "@/lib/chart/geometry";
import { CONSTELLATIONS, constellationDust, nearestSign, pairFigures } from "@/lib/galaxy/constellations";
import { preloadSignArt, signArtImage } from "@/lib/galaxy/signArt";
import { getSignVolume } from "@/lib/galaxy/signVolume";
import { CRUISE, HOLD_FLY, MAX_FLY, PLAY_CRUISE, aimedIndex, alongToGate, birthBoom, birthIgnite, ensureAutoClock, ensureFlyInput, exploringSign, galaxyTravel, gateForm, pinchQuiet, publishTravel, starGather, starSpark, stepBirth, stepExplore, stepPlayUntil, stepSeek, stepSelectionHold, stepZoom, stopAutoClock } from "@/lib/galaxy/travel";
import { clamp01, stationFromT, stationT, TEMPLE_SIGNS } from "@/lib/galaxy/temple";
import { bootIntro, introPlaying, stepIntro } from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import { useSessionStore } from "@/lib/chart/session/store";

type Star = {
  x: number;
  y: number;
  z: number;
  pz: number;
  r: number;
  a: number;
  hue: 0 | 1 | 2;
  ang: number;
  dist: number;
  bornAt: number;
};

type Cloud = {
  x: number;
  y: number;
  z: number;
  r: number;
  rgb: [number, number, number];
  a: number;
};

type Spark = {
  ang: number;
  dist: number;
  size: number;
  delay: number;
  hue: 0 | 1 | 2;
};

const FIGURE_PAIRS = new Map<string, ReturnType<typeof pairFigures>>();
function morphPairs(sign: (typeof CONSTELLATIONS)[number]) {
  let p = FIGURE_PAIRS.get(sign.id);
  if (!p) {
    p = pairFigures(sign.animal, sign.glyph);
    FIGURE_PAIRS.set(sign.id, p);
  }
  return p;
}

function spawnStar(far: boolean): Star {
  const tight = Math.random() < 0.62;
  const hueRoll = Math.random();
  const ang = Math.random() * Math.PI * 2;
  const dist = 0.06 + Math.pow(Math.random(), 0.62) * 1.14;
  return {
    x: (Math.random() - 0.5) * (tight ? 1.15 : 2.1),
    y: (Math.random() - 0.5) * (tight ? 0.55 : 1.35),
    z: far ? 0.82 + Math.random() * 0.18 : 0.06 + Math.random() * 0.94,
    pz: 1,
    r: 0.35 + Math.random() * 1.7,
    a: 0.28 + Math.random() * 0.72,
    hue: hueRoll < 0.08 ? 1 : hueRoll < 0.18 ? 2 : 0,
    ang,
    dist,
    bornAt: 0.26 + Math.random() * 0.4,
  };
}

function starFill(hue: 0 | 1 | 2, alpha: number) {
  if (hue === 1) return `rgba(186, 206, 232, ${alpha})`;
  if (hue === 2) return `rgba(244, 214, 176, ${alpha})`;
  return `rgba(239, 232, 220, ${alpha})`;
}

function easeOut(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) * (1 - x) * (1 - x);
}

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function finishBirth() {
  galaxyTravel.awaken = 1;
  if (galaxyTravel.birth >= 1) useGalaxy.getState().markBorn();
}

/** 2D sky so a WebGL failure never blanks the page. */
export function FallbackSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ensureAutoClock();
    ensureFlyInput();
    bootIntro();
    galaxyTravel.birth = 1;
    ensureFlyInput();
    preloadSignArt();
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const modest =
      typeof window !== "undefined" && (window.innerWidth < 720 || navigator.maxTouchPoints > 0);
    const STAR_N = modest ? 1600 : 2400;
    const DUST_N = modest ? 140 : 200;
    const SPARK_N = modest ? 140 : 200;
    const stars = Array.from({ length: STAR_N }, () => spawnStar(false));
    const dust = Array.from({ length: DUST_N }, () => {
      const s = spawnStar(false);
      s.r *= 0.45;
      s.a *= 0.65;
      s.bornAt = 0.34 + Math.random() * 0.28;
      return s;
    });
    const sparks: Spark[] = Array.from({ length: SPARK_N }, () => ({
      ang: Math.random() * Math.PI * 2,
      dist: 0.2 + Math.random() * 1.35,
      size: 0.7 + Math.random() * 2.4,
      delay: 0.3 + Math.random() * 0.09,
      hue: Math.random() < 0.2 ? 2 : Math.random() < 0.15 ? 1 : 0,
    }));
    const clouds: Cloud[] = [
      { x: 0.12, y: -0.06, z: 0.72, r: 1.15, rgb: [210, 176, 132], a: 0.16 },
      { x: -0.38, y: 0.18, z: 0.55, r: 1.35, rgb: [132, 154, 176], a: 0.14 },
      { x: 0.22, y: 0.28, z: 0.84, r: 0.9, rgb: [176, 150, 142], a: 0.12 },
      { x: -0.08, y: -0.3, z: 0.4, r: 1.45, rgb: [168, 156, 132], a: 0.13 },
      { x: 0.48, y: -0.2, z: 0.63, r: 1.05, rgb: [150, 164, 176], a: 0.11 },
      { x: -0.52, y: -0.12, z: 0.78, r: 1.2, rgb: [196, 158, 138], a: 0.1 },
      { x: 0.08, y: 0.22, z: 0.48, r: 1.55, rgb: [142, 152, 168], a: 0.1 },
      { x: 0.35, y: 0.05, z: 0.9, r: 0.85, rgb: [188, 172, 148], a: 0.09 },
    ];
    for (const s of stars) s.pz = s.z;
    for (const s of dust) s.pz = s.z;
    let vel = 0;
    let last = performance.now();
    let lastStation = 0;
    let downX = 0;
    let downY = 0;
    let trauma = 0;
    let gx = 0.5;
    let gy = 0.48;
    let glow = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!galaxyTravel.ptrOn) {
        gx = w * 0.5;
        gy = h * 0.48;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const plot = (x: number, z: number, scale: number) => {
      return [w * 0.5 + x * scale, h * 0.48 + z * scale] as const;
    };

    const project = (x: number, y: number, z: number, depth: number) => {
      const k = Math.max(0.04, z);
      return [w * 0.5 + (x * depth) / k, h * 0.48 + (y * depth) / k] as const;
    };

    const drawWheel = () => {
      const nat = useSessionStore.getState().session?.nativity;
      if (!nat) return;
      const scale = Math.min(w, h) * 0.055;
      const inner = 4.15 * scale;
      const outer = 6.55 * scale;

      ctx.strokeStyle = "rgba(239,232,220,0.7)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, outer, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(216,207,192,0.32)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, inner, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(20,18,16,0.55)";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, outer + 8, 0, Math.PI * 2);
      ctx.fill();

      for (const c of nat.houses) {
        const [x1, z1] = lonToXZ(c.lon, 4.15, nat.angles);
        const [x2, z2] = lonToXZ(c.lon, 6.7, nat.angles);
        const a = plot(x1, z1, scale);
        const b = plot(x2, z2, scale);
        const angle = c.house === 1 || c.house === 4 || c.house === 7 || c.house === 10;
        ctx.strokeStyle = angle ? "rgba(239,232,220,0.7)" : "rgba(239,232,220,0.28)";
        ctx.lineWidth = angle ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }

      for (const asp of nat.aspects) {
        const pa = nat.planetById[asp.a];
        const pb = nat.planetById[asp.b];
        if (!pa || !pb) continue;
        const [ax, az] = lonToXZ(pa.lon, pa.radius, nat.angles);
        const [bx, bz] = lonToXZ(pb.lon, pb.radius, nat.angles);
        const a = plot(ax, az, scale);
        const b = plot(bx, bz, scale);
        ctx.strokeStyle = ASPECT_COLOR[asp.type];
        ctx.globalAlpha = asp.iron ? 0.42 : 0.16;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.font = "12px Fraunces, Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const sign of nat.signs) {
        const [tx, tz] = lonToXZ(sign.startLon + 15, 6.95, nat.angles);
        const p = plot(tx, tz, scale);
        ctx.fillStyle = sign.intercepted ? "#6e675e" : "#9a9186";
        ctx.fillText(sign.abbr.toUpperCase(), p[0], p[1]);
      }

      for (const planet of nat.planets) {
        const [x, z] = lonToXZ(planet.lon, planet.radius, nat.angles);
        const p = plot(x, z, scale);
        const r = Math.max(3, planet.size * 14);
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
        ctx.fill();
        if (nat.alwaysLabel.includes(planet.id)) {
          ctx.fillStyle = "#efe8dc";
          ctx.font = "11px Fraunces, Georgia, serif";
          ctx.fillText(planet.glyph, p[0], p[1] - r - 8);
        }
      }
    };

    const flyStar = (s: Star, dt: number, speed: number, depth: number, fly: boolean) => {
      if (fly) {
        s.z -= speed * dt * 0.48;
        if (s.z <= 0.045) {
          const next = spawnStar(true);
          s.x = next.x;
          s.y = next.y;
          s.z = next.z;
          s.pz = next.z;
          s.r = next.r;
          s.a = next.a;
          s.hue = next.hue;
        }
      }
      const [px, py] = project(s.x, s.y, s.z, depth);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      const [qx, qy] = project(s.x, s.y, Math.max(s.pz, s.z + speed * 0.045), depth);
      s.pz = s.z;
      const pr = Math.min(2.2, s.r * (0.16 + (1 - s.z) * 1.55));
      const streak = Math.hypot(px - qx, py - qy);
      if (streak > 1.2) {
        ctx.strokeStyle = starFill(s.hue, s.a * (0.18 + Math.min(0.55, speed * 0.12)));
        ctx.lineWidth = Math.max(0.5, pr * 0.38);
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      if (pr > 1.15) {
        const rg = ctx.createRadialGradient(px, py, 0, px, py, pr * 2.1);
        rg.addColorStop(0, starFill(s.hue, Math.min(1, s.a * 0.95)));
        rg.addColorStop(0.22, starFill(s.hue, s.a * 0.28));
        rg.addColorStop(1, starFill(s.hue, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(px, py, pr * 2.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = starFill(s.hue, s.a);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.35, pr), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawSpark = (px: number, py: number, scale: number, alpha: number, flash: number) => {
      const a = Math.min(1, Math.max(0, alpha));
      const arm = (1.85 + flash * 1.1) * scale;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 246, 230, ${a * 0.72})`;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.4, 0.45 * scale);
      ctx.beginPath();
      ctx.moveTo(px - arm, py);
      ctx.lineTo(px + arm, py);
      ctx.moveTo(px, py - arm);
      ctx.lineTo(px, py + arm);
      ctx.stroke();
      ctx.restore();
    };

    const drawConstellation = (
      sign: (typeof CONSTELLATIONS)[number],
      along: number,
      form: number,
      depth: number,
      time: number,
      seed: number,
      held = false,
      showPlate = true,
    ) => {
      if (form < 0.03) return;
      const z = Math.max(0.1, 0.16 + Math.max(along, 0.05) * 0.52);
      const spread = 0.105;
      const reach = Math.min(w, h) * 0.2;
      const companions = constellationDust(seed, 12);
      const morph = held ? 1 : 0;
      const burst = 0;
      const pairs = morphPairs(sign);
      const assembled = held || along < 1.9 ? Math.max(0.88, starGather(along, Math.floor(pairs.length * 0.08), pairs.length + companions.length)) : starGather(along, Math.floor(pairs.length * 0.18), pairs.length + companions.length);
      ctx.save();
      ctx.globalAlpha = 0.2 + form * 0.8;
      const [nx, ny] = project(0, 0, z, depth);
      if (Number.isFinite(nx) && Number.isFinite(ny) && showPlate) {
        const pass = along < 0.34 ? Math.max(0, (along + 0.35) / 0.69) : along > 1.65 ? Math.max(0, (2.15 - along) / 0.5) : 1;
        const plate = form * assembled * (1 - morph * 0.35) * pass;
        const art = signArtImage(sign.id);
        if (plate > 0.04 && art.complete && art.naturalWidth > 2) {
          const aspect = art.naturalWidth / Math.max(1, art.naturalHeight);
          const aw = Math.min(w, h) * (0.38 / z);
          const ah = aw / aspect;
          ctx.save();
          ctx.globalAlpha = Math.min(1, Math.max(0, plate));
          ctx.drawImage(art, nx - aw / 2, ny - ah / 2, aw, ah);
          ctx.restore();
        }
        if (burst > 0.08) {
          const nr = Math.min(w, h) * (0.18 + form * 0.08 + burst * 0.12);
          ctx.strokeStyle = `rgba(255, 244, 220, ${burst * 0.28})`;
          ctx.lineWidth = 1.4 + burst * 1.8;
          ctx.beginPath();
          ctx.arc(nx, ny, nr * (0.35 + burst * 0.4), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      const paintStar = (sx: number, sy: number, mag: number, i: number) => {
        const kick = 1 + burst * 0.82;
        const [px, py] = project(sx * spread * kick, -sy * spread * kick, z, depth);
        if (!Number.isFinite(px) || !Number.isFinite(py)) return;
        const spark = starSpark(time, i, seed);
        const dx = px - gx;
        const dy = py - gy;
        const near = glow > 0.04 ? Math.exp(-(dx * dx + dy * dy) / (reach * 0.42) ** 2) * glow : 0;
        const flash = Math.max(0, spark - 1);
        const a = Math.min(1, (0.32 + mag * 0.7) * spark + near * 0.22 + burst * 0.18);
        const rad = (0.42 + mag * mag * 2.15) * (1 + flash * 0.7 + near * 0.14 + burst * 0.16);
        if (mag > 0.7) {
          drawSpark(px, py, 0.32 + mag * 0.28, a * 0.7, flash * 1.6 + near * 0.5);
        }
        const halo = Math.max(1.2, rad * 2.3);
        const rg = ctx.createRadialGradient(px, py, 0, px, py, halo);
        rg.addColorStop(0, `rgba(255, 248, 236, ${a})`);
        rg.addColorStop(0.22, `rgba(239, 232, 220, ${a * 0.32})`);
        rg.addColorStop(1, "rgba(239, 232, 220, 0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(px, py, halo, 0, Math.PI * 2);
        ctx.fill();
      };

      if (form > 0.04) {
        const vol = getSignVolume(sign.id);
        const body = vol?.stars;
        const total = (body?.length ?? pairs.length) + companions.length;
        for (let i = 0; i < companions.length; i++) {
          const d = companions[i]!;
          const gath = held ? 1 : starGather(along, (body?.length ?? pairs.length) + i, total);
          const ox = Math.cos(seed * 0.7 + i * 2.13) * 9.5;
          const oy = Math.sin(seed * 1.1 + i * 1.67) * 6.4;
          paintStar(d.x * gath + ox * (1 - gath), d.y * gath + oy * (1 - gath), d.mag * (0.4 + gath * 0.6) * form, 40 + i);
        }
        if (body && body.length) {
          const cap = Math.min(body.length, 280);
          for (let i = 0; i < cap; i++) {
            const t = body[i]!;
            const gath = held ? 1 : starGather(along, i, total);
            const ox = Math.sin(seed * 1.2 + i * 2.399) * 10.2;
            const oy = Math.cos(seed * 0.8 + i * 1.618) * 7.1;
            paintStar(t.x * 18 * gath + ox * (1 - gath), t.y * 18 * gath + oy * (1 - gath), t.mag, i);
          }
        } else {
          for (let i = 0; i < pairs.length; i++) {
            const p = pairs[i]!;
            const gath = held ? 1 : starGather(along, i, total);
            const ox = Math.sin(seed * 1.2 + i * 2.399) * 10.2;
            const oy = Math.cos(seed * 0.8 + i * 1.618) * 7.1;
            const rightShift = held ? 2.2 : 0;
            const sx = (p.ax + (p.gx - p.ax) * morph + rightShift * morph) * gath + ox * (1 - gath);
            const sy = (p.ay + (p.gy - p.ay) * morph) * gath + oy * (1 - gath);
            paintStar(sx, sy, p.am + (p.gm - p.am) * morph, i);
          }
        }
      }
      ctx.restore();
    };

    const drawPointerGlow = () => {
      if (glow < 0.02) return;
      const r = Math.min(w, h) * 0.14;
      if (r < 1 || !Number.isFinite(gx) || !Number.isFinite(gy)) return;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, `rgba(255, 246, 230, ${0.05 * glow})`);
      g.addColorStop(0.28, `rgba(232, 214, 176, ${0.022 * glow})`);
      g.addColorStop(1, "rgba(12, 11, 10, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const burstStar = (s: Star, b: number, cx: number, cy: number, depth: number, reach: number) => {
      const local = easeOut((b - s.bornAt) / 0.28);
      if (local <= 0) return;
      const ex = cx + Math.cos(s.ang) * s.dist * local * reach;
      const ey = cy + Math.sin(s.ang) * s.dist * local * reach * 0.86;
      const [wx, wy] = project(s.x, s.y, s.z, depth);
      const mix = b > 0.78 ? smooth((b - 0.78) / 0.22) : 0;
      const px = ex + (wx - ex) * mix;
      const py = ey + (wy - ey) * mix;
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      const hot = 1.55 - local * 1.0;
      const pr = Math.max(0.4, s.r * (0.32 + hot * 1.05) * (0.42 + local));
      ctx.fillStyle = starFill(s.hue, s.a * Math.min(1, local * 1.15));
      if (pr < 1.15) {
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        return;
      }
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawBirth = (b: number, cx: number, cy: number, depth: number) => {
      const reach = Math.min(w, h);
      const ignite = birthIgnite(b);
      const boom = birthBoom(b);
      const nebula = smooth((b - 0.1) / 0.48);

      const coreR = (6 + ignite * 26 + boom * 140) * (reach / 720);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(8, coreR * 3.2));
      core.addColorStop(0, `rgba(255, 248, 236, ${0.16 * ignite + boom * 0.48})`);
      core.addColorStop(0.14, `rgba(255, 226, 176, ${0.2 * ignite + boom * 0.24})`);
      core.addColorStop(0.4, `rgba(196, 148, 96, ${0.14 * nebula})`);
      core.addColorStop(0.72, `rgba(90, 72, 52, ${0.08 * nebula})`);
      core.addColorStop(1, "rgba(12, 11, 10, 0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      if (b > 0.26 && b < 0.78) {
        const rings = [
          { t0: 0.28, span: 0.4, w: 5.5 },
          { t0: 0.34, span: 0.42, w: 2.6 },
        ];
        for (const ring of rings) {
          const t = Math.min(1, Math.max(0, (b - ring.t0) / ring.span));
          if (t <= 0) continue;
          const eased = 1 - (1 - t) * (1 - t) * (1 - t);
          const r = eased * reach * 0.9;
          const a = (1 - t) * (1 - t) * 0.72;
          ctx.strokeStyle = `rgba(255, 244, 220, ${a})`;
          ctx.lineWidth = ring.w * (1 - t * 0.7);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      const seedR = (2.2 + ignite * 9 + boom * 16) * (reach / 720);
      const seed = ctx.createRadialGradient(cx, cy, 0, cx, cy, seedR);
      seed.addColorStop(0, `rgba(255, 252, 246, ${0.92 * ignite})`);
      seed.addColorStop(0.35, `rgba(255, 214, 150, ${0.5 * ignite})`);
      seed.addColorStop(1, "rgba(255, 200, 120, 0)");
      ctx.fillStyle = seed;
      ctx.beginPath();
      ctx.arc(cx, cy, seedR, 0, Math.PI * 2);
      ctx.fill();

      for (const s of sparks) {
        const u = (b - s.delay) / 0.32;
        if (u <= 0 || u >= 1) continue;
        const eased = 1 - (1 - u) * (1 - u) * (1 - u);
        const d = eased * s.dist * reach * 0.58;
        const px = cx + Math.cos(s.ang) * d;
        const py = cy + Math.sin(s.ang) * d;
        ctx.fillStyle = starFill(s.hue, (1 - u) * 0.92);
        const sz = s.size * (1.35 - u);
        ctx.fillRect(px - sz, py - sz, sz * 2, sz * 2);
      }

      const reachBurst = reach * 0.62;
      for (const s of stars) burstStar(s, b, cx, cy, depth, reachBurst);
    };

    const tickSky = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const state = useSessionStore.getState();
      const entered = state.session !== null;
      const chatting = state.claim !== null && !entered;
      if (stepBirth(dt)) finishBirth();
      else if (galaxyTravel.birth >= 1) finishBirth();
      stepIntro(dt);
      stepExplore(dt);
      const arriving = introPlaying();
      const birthing = arriving;
      const exploring = exploringSign();
      const flying = !entered && !chatting && !birthing && !exploring;
      const hands = galaxyTravel.dragging || performance.now() < galaxyTravel.wheelUntil;
      galaxyTravel.handsOn = hands;
      galaxyTravel.busy = chatting || entered || birthing;
      if (w < 2 || h < 2) return;
      ctx.fillStyle = "#0c0b0a";
      ctx.fillRect(0, 0, w, h);
      const sought = stepSeek(galaxyTravel.t, dt);
      galaxyTravel.t = clamp01(sought.t);
      if (sought.active) {
        galaxyTravel.tTarget = galaxyTravel.t;
      }
      const playing = stepPlayUntil(galaxyTravel.t);
      const traveling = sought.active || playing;
      galaxyTravel.traveling = traveling;
      if (!Number.isFinite(vel)) vel = CRUISE;
      vel += galaxyTravel.steer;
      galaxyTravel.steer = 0;
      if (birthing) {
        vel = 0;
        galaxyTravel.speed = 0;
      } else if (flying) {
        if (sought.active) {
          vel *= Math.exp(-dt * 3.2);
        } else if (hands) {
          const want = galaxyTravel.hold !== 0 ? galaxyTravel.hold * HOLD_FLY : 0;
          if (want === 0) vel *= Math.exp(-dt * 1.8);
          else vel += (want - vel) * (1 - Math.exp(-dt * 5.2));
          vel = Math.max(-HOLD_FLY, Math.min(MAX_FLY, vel));
        } else if (!traveling && galaxyTravel.idle > 0.35) {
          vel *= Math.exp(-dt * 2.8);
          if (Math.abs(vel) < 0.02) vel = 0;
        } else if (playing) {
          vel += (PLAY_CRUISE - vel) * (1 - Math.exp(-dt * 0.55));
          vel = Math.min(MAX_FLY, Math.max(0, vel));
        } else {
          vel += (CRUISE - vel) * (1 - Math.exp(-dt * (vel > 0.14 ? 0.45 : 0.28)));
          vel = Math.min(MAX_FLY, Math.max(0, vel));
        }
        galaxyTravel.speed = vel * 38;
        if (!sought.active) {
          galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget + vel * dt * 0.045);
          galaxyTravel.t += (galaxyTravel.tTarget - galaxyTravel.t) * (1 - Math.exp(-dt * 3.4));
          galaxyTravel.t = clamp01(galaxyTravel.t);
        }
        galaxyTravel.awaken = Math.min(
          1,
          galaxyTravel.awaken + dt * (galaxyTravel.moved ? 0.45 : 0.16),
        );
        stepSelectionHold();
        publishTravel(galaxyTravel.t, galaxyTravel.moved);
      } else if (chatting) {
        vel *= Math.exp(-dt * 3.2);
        if (vel < 0.04) vel = 0;
        galaxyTravel.speed = vel * 38;
      }
      trauma *= Math.exp(-dt * 4.2);
      const shake = trauma * trauma;
      const lookX = exploring ? galaxyTravel.exploreLookX : 0;
      const lookY = exploring ? galaxyTravel.exploreLookY : 0;
      const cx = w * 0.5 + Math.sin(now * 0.053) * shake * 6 + lookX * 28;
      const cy = h * 0.48 + Math.cos(now * 0.061) * shake * 4 - lookY * 22;
      const cur = stationFromT(galaxyTravel.t);
      stepZoom(dt, cur !== lastStation);
      lastStation = cur;
      const depth = Math.min(w, h) * 0.42 * galaxyTravel.zoom;
      glow += ((galaxyTravel.ptrOn && !entered ? 1 : 0) - glow) * (1 - Math.exp(-dt * 7));
      if (
        galaxyTravel.ptrOn &&
        Number.isFinite(galaxyTravel.ptrX) &&
        Number.isFinite(galaxyTravel.ptrY)
      ) {
        gx = w * (galaxyTravel.ptrX + 0.5);
        gy = h * (galaxyTravel.ptrY + 0.5);
      }
      if (birthing) {
        drawBirth(galaxyTravel.birth, cx, cy, depth);
      } else {
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.72);
        core.addColorStop(0, "rgba(46, 38, 30, 0.55)");
        core.addColorStop(0.28, "rgba(22, 18, 16, 0.22)");
        core.addColorStop(1, "rgba(12, 11, 10, 0)");
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, w, h);
        if (!entered) {
          for (const c of clouds) {
            if (flying) {
              c.z -= vel * dt * 0.08;
              if (c.z < 0.18) {
                c.z = 0.92;
                c.x = (Math.random() - 0.5) * 1.4;
                c.y = (Math.random() - 0.5) * 0.9;
              }
            }
            const [px, py] = project(c.x, c.y, c.z, depth);
            const rad = (c.r * depth) / Math.max(0.2, c.z);
            if (!Number.isFinite(px) || rad < 1) continue;
            const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
            g.addColorStop(0, `rgba(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]},${c.a})`);
            g.addColorStop(1, `rgba(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.lineCap = "round";
        for (const s of stars) flyStar(s, dt, vel, depth, flying);
        if (!entered) {
          for (const s of dust) flyStar(s, dt, vel * 1.08, depth, flying);
        }
        if (!entered) drawPointerGlow();
      }

      if (entered) {
        drawWheel();
      } else if (!birthing) {
        const t = galaxyTravel.t;
        const awaken = galaxyTravel.awaken;
        const picked = state.claim?.signId ?? state.session?.signId ?? null;
        const skyTime = now / 1000;
        if (chatting && picked) {
          const holdIdx = CONSTELLATIONS.findIndex((c) => c.id === picked);
          const hold = holdIdx >= 0 ? CONSTELLATIONS[holdIdx] : undefined;
          if (hold) drawConstellation(hold, 0.42, 1, depth, skyTime, holdIdx, true, true);
        } else if (galaxyTravel.seekDirect && galaxyTravel.seek != null) {
          const aim = aimedIndex(t);
          const dest = stationT(aim);
          const along = Math.max(0.12, Math.abs(t - dest) * 8 + 0.35);
          const sign = CONSTELLATIONS[aim];
          if (sign) drawConstellation(sign, along, 0.95 * awaken, depth, skyTime, aim, false, true);
        } else {
          const cur = stationFromT(t);
          const nxt = Math.min(11, cur + 1);
          for (const i of [cur, nxt]) {
            const dest = stationT(i);
            const along = Math.max(0.12, Math.abs(t - dest) * 8 + 0.35);
            const focused = i === aimedIndex(t) || i === cur;
            const form = (focused ? 0.95 : 0.45) * awaken;
            const sign = CONSTELLATIONS[i];
            if (sign && form > 0.04) drawConstellation(sign, along, form, depth, skyTime, i, false, focused);
          }
        }
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      try {
        tickSky(now);
      } catch {
        /* never let a bad frame kill the sky */
      }
    };

    if (galaxyTravel.birth >= 1) finishBirth();
    raf = requestAnimationFrame(tick);

    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      downX = 0;
      const state = useSessionStore.getState();
      if (state.session || state.claim) return;
      if (galaxyTravel.birth < 1) return;
      if (exploringSign()) return;
      if (Math.hypot(dx, dy) > 10 || galaxyTravel.hold !== 0 || pinchQuiet()) return;
      const r = canvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.48;
      if (Math.hypot(nx, ny * 1.15) < 0.3) {
        const idx = nearestSign(galaxyTravel.t);
        const sign = CONSTELLATIONS[idx];
        if (sign) useSessionStore.getState().openClaim(sign.id);
      }
    };
    const onDownTap = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    canvas.addEventListener("pointerdown", onDownTap);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDownTap);
      canvas.removeEventListener("pointerup", onUp);
      stopAutoClock();
    };
  }, []);

  return (
    <div className="canvas-root" style={{ background: "#0c0b0a" }}>
      <canvas ref={canvasRef} className="h-full w-full touch-none" aria-hidden />
    </div>
  );
}
