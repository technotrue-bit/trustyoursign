import { i as __toESM } from "../_runtime.mjs";
import { c as CanvasTexture, d as LinearFilter, g as require_react, h as require_jsx_runtime, l as ClampToEdgeWrapping, p as SRGBColorSpace } from "../_libs/@react-three/fiber+[...].mjs";
import { t as create } from "../_libs/zustand.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-tDKVJiq7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function pts(pairs, scale = 1) {
	return { stars: pairs.map(([x, y, mag]) => ({
		x: x * scale,
		y: y * scale,
		mag: mag ?? .72
	})) };
}
function glyphOf(kind) {
	return pts({
		aries: [
			[-1.6, 1.4],
			[-.7, 2.1],
			[0, .2],
			[.7, 2.1],
			[1.6, 1.4],
			[
				0,
				-1.8,
				.9
			]
		],
		taurus: [
			[-2.1, 1.6],
			[-1.2, 2.15],
			[-.4, 1.1],
			[.4, 1.1],
			[1.2, 2.15],
			[2.1, 1.6],
			[
				0,
				-.4,
				1
			],
			[
				0,
				-1.9,
				.85
			]
		],
		gemini: [
			[-1.3, 2],
			[-1.3, -1.8],
			[1.3, 2],
			[1.3, -1.8],
			[-1.3, .4],
			[1.3, .4],
			[
				-1.3,
				2,
				.4
			],
			[
				1.3,
				2,
				.4
			]
		],
		cancer: [
			[-1.8, .9],
			[-.6, 1.4],
			[.2, .4],
			[-.5, -.3],
			[1.8, -.9],
			[.6, -1.4],
			[-.2, -.4],
			[.5, .3]
		],
		leo: [
			[-.2, 2.1],
			[.9, 1.7],
			[1.6, .6],
			[.7, -.2],
			[-.6, -.5],
			[-1.5, -1.3],
			[-.7, -2],
			[.6, -1.8]
		],
		virgo: [
			[-2.1, 1.9],
			[-1.1, 1.2],
			[-.2, .3],
			[.8, -.6],
			[1.8, -1.5],
			[2.6, -2.2],
			[1.2, .9],
			[2.2, .2]
		],
		libra: [
			[0, 2],
			[-2.2, .3],
			[2.2, .3],
			[-2.4, -1.5],
			[-.8, -1.5],
			[.8, -1.5],
			[2.4, -1.5]
		],
		scorpio: [
			[-2.8, .8],
			[-1.6, .5],
			[-.4, .3],
			[.8, .1],
			[1.9, -.3],
			[2.7, -1.1],
			[2.1, -2],
			[1.1, -2.3]
		],
		sagittarius: [
			[-2.2, -1.4],
			[-.8, -.4],
			[.4, .5],
			[1.6, 1.5],
			[2.4, 2.1],
			[.9, 1.9],
			[1.9, .6],
			[-.2, -1.6]
		],
		capricorn: [
			[-2.4, .2],
			[-1.3, .8],
			[-.2, .3],
			[.9, -.6],
			[2.1, -1.4],
			[2.8, -.2],
			[2.2, 1.1],
			[.4, -1.8]
		],
		aquarius: [
			[-2.4, .7],
			[-1.2, 1.1],
			[0, .6],
			[1.2, 1.1],
			[2.4, .7],
			[-1.8, -.8],
			[-.4, -.4],
			[1.1, -.9],
			[2.3, -.5]
		],
		pisces: [
			[-2.3, 1.6],
			[-1.6, .2],
			[-2.1, -1.5],
			[2.3, 1.6],
			[1.6, .2],
			[2.1, -1.5],
			[-.6, .15],
			[.6, -.15]
		]
	}[kind], .92);
}
function animalOf(kind) {
	return pts({
		aries: [
			[-2.2, 1.9],
			[-1.5, 2.4],
			[-.3, 1.2],
			[.3, 1.25],
			[1.5, 2.4],
			[2.2, 1.9],
			[0, .4],
			[-.9, -.8],
			[.9, -.8],
			[0, -1.7]
		],
		taurus: [
			[-2.4, 1.9],
			[-1.7, 2.45],
			[-.5, 1.1],
			[.5, 1.1],
			[1.7, 2.45],
			[2.4, 1.9],
			[0, .2],
			[-1.1, -1.2],
			[1.2, -1.2],
			[0, -2]
		],
		gemini: [
			[-1.6, 2.1],
			[-1.6, .4],
			[-1.6, -1.8],
			[-2.3, .6],
			[-.9, .6],
			[1.6, 2.1],
			[1.6, .4],
			[1.6, -1.8],
			[.9, .6],
			[2.3, .6]
		],
		cancer: [
			[-2, 1.2],
			[-1, 1.6],
			[.1, .5],
			[-.7, -.4],
			[2, -1.1],
			[1, -1.6],
			[-.1, -.5],
			[.7, .4]
		],
		leo: [
			[-.4, 2.2],
			[.8, 2],
			[1.8, 1.1],
			[1.3, .1],
			[.1, -.3],
			[-1.2, -.7],
			[-1.8, -1.6],
			[-.5, -2.1],
			[.9, -1.7]
		],
		virgo: [
			[-2.3, 2],
			[-1.3, 1.2],
			[-.3, .3],
			[.7, -.6],
			[1.7, -1.4],
			[2.5, -2.1],
			[1.1, 1],
			[2.1, .3]
		],
		libra: [
			[0, 2.2],
			[-2.4, .4],
			[2.4, .4],
			[-2.6, -1.6],
			[-1.1, -1.6],
			[1.1, -1.6],
			[2.6, -1.6]
		],
		scorpio: [
			[-3, 1],
			[-1.8, .6],
			[-.6, .35],
			[.6, .15],
			[1.8, -.25],
			[2.8, -1.15],
			[2.2, -2.15],
			[1.1, -2.4]
		],
		sagittarius: [
			[-2.4, -1.5],
			[-1, -.5],
			[.3, .5],
			[1.5, 1.5],
			[2.5, 2.2],
			[.8, 2],
			[2, .5],
			[-.4, -1.8]
		],
		capricorn: [
			[-2.5, .3],
			[-1.4, .9],
			[-.2, .35],
			[.9, -.55],
			[2.2, -1.45],
			[2.9, -.15],
			[2.3, 1.2],
			[.3, -1.85]
		],
		aquarius: [
			[-2.5, .8],
			[-1.2, 1.2],
			[0, .7],
			[1.2, 1.2],
			[2.5, .8],
			[-1.9, -.9],
			[-.4, -.45],
			[1.1, -1],
			[2.4, -.55]
		],
		pisces: [
			[-2.4, 1.7],
			[-1.7, .2],
			[-2.2, -1.6],
			[2.4, 1.7],
			[1.7, .2],
			[2.2, -1.6],
			[-.5, .2],
			[.5, -.2]
		]
	}[kind], 1);
}
var CONSTELLATIONS = [
	{
		id: "aries",
		name: "Aries",
		month: "March 21 – April 19",
		span: "Mar – Apr",
		essence: "The first heat. A beginning that does not ask.",
		element: "fire",
		glyph: "♈"
	},
	{
		id: "taurus",
		name: "Taurus",
		month: "April 20 – May 20",
		span: "Apr – May",
		essence: "The floor. Enough. A body that stays.",
		element: "earth",
		glyph: "♉"
	},
	{
		id: "gemini",
		name: "Gemini",
		month: "May 21 – June 20",
		span: "May – Jun",
		essence: "Two channels. Talk as a way of arriving.",
		element: "air",
		glyph: "♊"
	},
	{
		id: "cancer",
		name: "Cancer",
		month: "June 21 – July 22",
		span: "Jun – Jul",
		essence: "The shell. Safety before the room gets you.",
		element: "water",
		glyph: "♋"
	},
	{
		id: "leo",
		name: "Leo",
		month: "July 23 – August 22",
		span: "Jul – Aug",
		essence: "The will that remains after the performance.",
		element: "fire",
		glyph: "♌"
	},
	{
		id: "virgo",
		name: "Virgo",
		month: "August 23 – September 22",
		span: "Aug – Sep",
		essence: "The craft. Make it accurate, then it is sacred.",
		element: "earth",
		glyph: "♍"
	},
	{
		id: "libra",
		name: "Libra",
		month: "September 23 – October 22",
		span: "Sep – Oct",
		essence: "The in-between. A scale that wants a true weight.",
		element: "air",
		glyph: "♎"
	},
	{
		id: "scorpio",
		name: "Scorpio",
		month: "October 23 – November 21",
		span: "Oct – Nov",
		essence: "All-in or out. The hook under the pretty floor.",
		element: "water",
		glyph: "♏"
	},
	{
		id: "sagittarius",
		name: "Sagittarius",
		month: "November 22 – December 21",
		span: "Nov – Dec",
		essence: "The arrow. A life that will not stay small.",
		element: "fire",
		glyph: "♐"
	},
	{
		id: "capricorn",
		name: "Capricorn",
		month: "December 22 – January 19",
		span: "Dec – Jan",
		essence: "Climb it. Structure is how the mountain remembers you.",
		element: "earth",
		glyph: "♑"
	},
	{
		id: "aquarius",
		name: "Aquarius",
		month: "January 20 – February 18",
		span: "Jan – Feb",
		essence: "The future leaking in. A current that will not stay private.",
		element: "air",
		glyph: "♒"
	},
	{
		id: "pisces",
		name: "Pisces",
		month: "February 19 – March 20",
		span: "Feb – Mar",
		essence: "Two fish, one ocean. Dissolve, then return with the dream intact.",
		element: "water",
		glyph: "♓"
	}
].map((c) => ({
	...c,
	animal: animalOf(c.id),
	figure: glyphOf(c.id)
}));
function wrap12(t) {
	return (t % 12 + 12) % 12;
}
function nearestSign(t) {
	const u = wrap12(t);
	return Math.round(u) % 12;
}
function signStation(index) {
	return (Math.round(index) % 12 + 12) % 12;
}
function signedDelta(from, to) {
	const a = wrap12(from);
	let d = wrap12(to) - a;
	if (d > 6) d -= 12;
	if (d < -6) d += 12;
	return d;
}
function constellationDust(index, n) {
	const out = [];
	for (let i = 0; i < n; i++) {
		const a = index * 1.73 + i * 2.399;
		const r = 2.4 + i % 5 * .55;
		out.push({
			x: Math.cos(a) * r,
			y: Math.sin(a * .82) * r * .62,
			mag: .28 + i % 4 * .08
		});
	}
	return out;
}
function pairFigures(animal, glyph) {
	const a = animal.stars;
	const g = glyph.stars;
	const n = Math.max(a.length, g.length);
	const pairs = [];
	for (let i = 0; i < n; i++) {
		const as = a[i % a.length];
		const gs = g[i % g.length];
		pairs.push({
			ax: as.x,
			ay: as.y,
			am: as.mag,
			gx: gs.x,
			gy: gs.y,
			gm: gs.mag
		});
	}
	return pairs;
}
var SIGN_ART = {
	aries: "/signs/aries.png",
	taurus: "/signs/taurus.png",
	gemini: "/signs/gemini.png",
	cancer: "/signs/cancer.png",
	leo: "/signs/leo.png",
	virgo: "/signs/virgo.png",
	libra: "/signs/libra.png",
	scorpio: "/signs/scorpio.png",
	sagittarius: "/signs/sagittarius.png",
	capricorn: "/signs/capricorn.png",
	aquarius: "/signs/aquarius.png",
	pisces: "/signs/pisces.png"
};
var W = 1024;
var H = 576;
var images = /* @__PURE__ */ new Map();
/** Every canvas for a URL — independent, never shared across meshes. */
var texturesByUrl = /* @__PURE__ */ new Map();
/** Textures that actually had pixels drawn — keyed by texture, not URL. */
var paintedTex = /* @__PURE__ */ new WeakSet();
var aspects = /* @__PURE__ */ new Map();
function style(tex) {
	tex.colorSpace = SRGBColorSpace;
	tex.generateMipmaps = false;
	tex.minFilter = LinearFilter;
	tex.magFilter = LinearFilter;
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = ClampToEdgeWrapping;
	tex.premultiplyAlpha = false;
}
function blankCanvas() {
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	return c;
}
function register(url, tex) {
	let set = texturesByUrl.get(url);
	if (!set) {
		set = /* @__PURE__ */ new Set();
		texturesByUrl.set(url, set);
	}
	set.add(tex);
}
function rasterAll(id) {
	const set = texturesByUrl.get(SIGN_ART[id]);
	if (!set) return;
	for (const tex of set) raster(id, tex);
}
function ensureImage(id) {
	const url = SIGN_ART[id];
	let img = images.get(url);
	if (img) return img;
	img = new Image();
	img.decoding = "async";
	img.onload = () => {
		rasterAll(id);
	};
	img.onerror = () => {
		window.setTimeout(() => {
			images.delete(url);
			ensureImage(id);
		}, 700);
	};
	img.src = url;
	images.set(url, img);
	return img;
}
function raster(id, tex) {
	const url = SIGN_ART[id];
	const img = images.get(url);
	if (!img || !img.complete || (img.naturalWidth ?? 0) < 2) return false;
	const canvas = tex.image;
	if (!canvas || typeof canvas.getContext !== "function") return false;
	if (canvas.width !== W) canvas.width = W;
	if (canvas.height !== H) canvas.height = H;
	const ctx = canvas.getContext("2d", { alpha: true });
	if (!ctx) return false;
	ctx.clearRect(0, 0, W, H);
	const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
	const cr = W / H;
	let dw;
	let dh;
	let dx;
	let dy;
	if (ir > cr) {
		dw = W;
		dh = dw / ir;
		dx = 0;
		dy = (H - dh) / 2;
	} else {
		dh = H;
		dw = dh * ir;
		dy = 0;
		dx = (W - dw) / 2;
	}
	ctx.drawImage(img, dx, dy, dw, dh);
	aspects.set(url, img.naturalWidth / Math.max(1, img.naturalHeight));
	style(tex);
	tex.needsUpdate = true;
	paintedTex.add(tex);
	register(url, tex);
	return true;
}
/** Draw this sign onto THIS texture. Never skip just because another canvas for the same URL was painted. */
function hydrateSignArt(id, tex) {
	register(SIGN_ART[id], tex);
	ensureImage(id);
	if (paintedTex.has(tex)) return true;
	return raster(id, tex);
}
/** Fresh canvas per call. Do not share / dispose these textures. */
function loadSignArt(id) {
	const tex = new CanvasTexture(blankCanvas());
	style(tex);
	register(SIGN_ART[id], tex);
	ensureImage(id);
	hydrateSignArt(id, tex);
	return tex;
}
/** Warm the PNG only — does not allocate a canvas. */
function primeSignArt(id) {
	if (typeof window === "undefined") return;
	ensureImage(id);
}
function preloadSignArt() {
	if (typeof window === "undefined") return;
	Object.keys(SIGN_ART).forEach((id) => {
		ensureImage(id);
	});
}
function artReady(tex) {
	return paintedTex.has(tex);
}
function artAspect(tex, fallback = 16 / 9) {
	for (const [url, set] of texturesByUrl) if (set.has(tex)) return aspects.get(url) ?? fallback;
	return fallback;
}
function signArtImage(id) {
	return ensureImage(id);
}
function plateReady(id) {
	const set = texturesByUrl.get(SIGN_ART[id]);
	if (set) {
		for (const tex of set) if (paintedTex.has(tex)) return true;
	}
	const img = images.get(SIGN_ART[id]);
	return Boolean(img?.complete && (img.naturalWidth ?? 0) > 2);
}
var useGalaxy = create((set, get) => ({
	t: 0,
	moved: false,
	signIndex: 0,
	born: false,
	setTravel: (t, moved) => {
		const signIndex = nearestSign(t);
		const prev = get();
		if (prev.signIndex === signIndex && prev.moved === !!moved && Math.abs(prev.t - t) < .04) return;
		set({
			t: wrap12(t),
			signIndex,
			moved: moved ?? prev.moved
		});
	},
	markBorn: () => {
		if (get().born) return;
		set({ born: true });
	}
}));
function currentConstellation() {
	return CONSTELLATIONS[useGalaxy.getState().signIndex];
}
/** Shared mutable travel. Written every frame by the camera. Not React state. */
var BIRTH_SECONDS = 3.85;
var CRUISE = .14;
var MAX_FLY = 1.12;
var HOLD_FLY = .58;
var PLAY_CRUISE = .48;
var GATE = .55;
var MORPH_FAR = .92;
var GATHER_FAR = 2.55;
var GATHER_LOCK = 1.12;
var SEEK_ARRIVE = .55;
var SEEK_THROUGH = .34;
var BIRTH_DT_CAP = .032;
var OPEN_T = -.55;
var reduceCache = false;
var reduceAt = -1e9;
var autoClock = 0;
var autoLast = 0;
var flyBound = false;
var galaxyTravel = {
	t: OPEN_T,
	moved: false,
	seek: null,
	playUntil: null,
	awaken: 0,
	speed: 0,
	birth: 0,
	ptrX: 0,
	ptrY: 0,
	ptrOn: false,
	idle: 0,
	idleAt: 0,
	handsOn: false,
	traveling: false,
	busy: false,
	hold: 0,
	steer: 0,
	dragging: false,
	wheelUntil: 0
};
function prefersReducedMotion() {
	if (typeof window === "undefined") return false;
	const now = typeof performance !== "undefined" ? performance.now() : Date.now();
	if (now - reduceAt > 800) {
		reduceAt = now;
		reduceCache = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}
	return reduceCache;
}
function smooth01(x) {
	const t = Math.min(1, Math.max(0, x));
	return t * t * (3 - 2 * t);
}
function nowMs() {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}
function restIdle() {
	galaxyTravel.idle = 0;
	galaxyTravel.idleAt = nowMs();
}
function stepBirth(dt) {
	if (galaxyTravel.birth >= 1) return false;
	if (prefersReducedMotion()) {
		galaxyTravel.birth = 1;
		return true;
	}
	const step = Math.min(typeof dt === "number" && Number.isFinite(dt) && dt > 0 ? dt : 1 / 60, BIRTH_DT_CAP);
	const before = galaxyTravel.birth;
	galaxyTravel.birth = Math.min(1, galaxyTravel.birth + step / BIRTH_SECONDS);
	return before < 1 && galaxyTravel.birth >= 1;
}
function skipBirth() {
	if (galaxyTravel.birth >= 1) return false;
	galaxyTravel.birth = 1;
	galaxyTravel.awaken = 1;
	restIdle();
	return true;
}
function resetTravel(replayBirth) {
	galaxyTravel.t = OPEN_T;
	galaxyTravel.moved = false;
	galaxyTravel.seek = null;
	galaxyTravel.playUntil = null;
	galaxyTravel.awaken = replayBirth ? 0 : 1;
	galaxyTravel.speed = 0;
	galaxyTravel.birth = replayBirth ? 0 : 1;
	galaxyTravel.ptrOn = false;
	galaxyTravel.handsOn = false;
	galaxyTravel.traveling = false;
	galaxyTravel.busy = false;
	galaxyTravel.hold = 0;
	galaxyTravel.steer = 0;
	galaxyTravel.dragging = false;
	galaxyTravel.wheelUntil = 0;
	restIdle();
}
function birthIgnite(b) {
	return smooth01(b / .2);
}
function birthBoom(b) {
	if (b < .16 || b > .64) return 0;
	const x = (b - .36) * 6.4;
	return Math.exp(-(x * x));
}
function starSpark(time, i, seed) {
	if (prefersReducedMotion()) return 1;
	return .96 + .04 * Math.sin(time * (.85 + i % 5 * .12) + seed + i * .71) + Math.pow(.5 + .5 * Math.sin(time * (1.7 + i % 7 * .21) + seed * 1.3 + i * 2.05), 18) * .2;
}
function seekSign(index) {
	const i = (Math.round(index) % 12 + 12) % 12;
	galaxyTravel.seek = signStation(i) - SEEK_ARRIVE;
	galaxyTravel.playUntil = null;
	galaxyTravel.moved = true;
	galaxyTravel.awaken = 1;
	const sign = CONSTELLATIONS[i];
	if (sign) primeSignArt(sign.id);
	const nxt = CONSTELLATIONS[(i + 1) % 12];
	if (nxt) primeSignArt(nxt.id);
	restIdle();
	useGalaxy.getState().setTravel(galaxyTravel.t, true);
	return i;
}
function noteControl() {
	restIdle();
	galaxyTravel.playUntil = null;
}
function nextSignIndex(t) {
	return (Math.round(wrap12(t)) % 12 + 1) % 12;
}
function aimedIndex(t = galaxyTravel.t) {
	if (galaxyTravel.seek != null) return nearestSign(galaxyTravel.seek);
	return nearestSign(t);
}
function alongToGate(t, index) {
	return signedDelta(t, index + GATE);
}
function gateForm(along, index, t) {
	if (index != null && t != null) {
		const n = nearestSign(t);
		const nxt = (n + 1) % 12;
		const aim = aimedIndex(t);
		if (index !== n && index !== nxt && index !== aim) return 0;
		if (index === nxt && index !== aim && along < .35) return 0;
		if (index !== n && along < .22) return 0;
	}
	if (along > 2.85) return 0;
	if (along > 1.05) return smooth01((2.85 - along) / 1.8);
	if (along > .04) return 1;
	if (along > -.62) return smooth01((along + .62) / .66);
	return 0;
}
function signMorph(along) {
	if (prefersReducedMotion()) return along < .9 ? 1 : 0;
	if (along >= .92) return 0;
	if (along <= .42) return 1;
	return smooth01((MORPH_FAR - along) / Math.max(.08, .5));
}
function morphBurst(along) {
	if (prefersReducedMotion()) return 0;
	if (along > .92 || along < .42) return 0;
	const x = (along - .67) / .14;
	return Math.exp(-(x * x));
}
function starGather(along, i, n) {
	if (prefersReducedMotion()) return along < 1.7 ? 1 : 0;
	const lag = i / Math.max(1, n) * .46;
	const far = GATHER_FAR - lag * .14;
	const lock = GATHER_LOCK - lag * .18;
	if (along >= far) return 0;
	if (along <= lock) return 1;
	return smooth01((far - along) / Math.max(.1, far - lock));
}
function stepSeek(t, dt) {
	const dest = galaxyTravel.seek;
	if (dest == null) return {
		t,
		active: false
	};
	const gap = signedDelta(t, dest);
	const dist = Math.abs(gap);
	if (dist < .04) {
		galaxyTravel.seek = null;
		return {
			t: t + gap,
			active: false
		};
	}
	return {
		t: t + Math.sign(gap) * Math.min(dist, (dist > 2.4 ? 2.6 : dist > 1.15 ? .92 : .34) * dt),
		active: true
	};
}
function stepPlayUntil(t) {
	const dest = galaxyTravel.playUntil;
	if (dest == null) return false;
	if (t >= dest) {
		galaxyTravel.playUntil = null;
		return false;
	}
	return true;
}
function stepAutoSign(_dt, opts) {
	if (!opts.canAdvance || opts.traveling || opts.handsOn) {
		restIdle();
		return false;
	}
	const now = nowMs();
	if (!galaxyTravel.idleAt) galaxyTravel.idleAt = now;
	galaxyTravel.idle = (now - galaxyTravel.idleAt) / 1e3;
	if (galaxyTravel.idle < 7) return false;
	restIdle();
	const i = nearestSign(galaxyTravel.t);
	if (signMorph(alongToGate(galaxyTravel.t, i)) < .45) {
		galaxyTravel.playUntil = signStation(i) + SEEK_THROUGH;
		galaxyTravel.moved = true;
		galaxyTravel.awaken = 1;
		return true;
	}
	seekSign(nextSignIndex(galaxyTravel.t));
	return true;
}
function ensureAutoClock() {
	if (typeof window === "undefined" || autoClock) return;
	autoLast = nowMs();
	const tick = (now) => {
		autoClock = requestAnimationFrame(tick);
		const dt = Math.min(.1, (now - autoLast) / 1e3);
		autoLast = now;
		if (!Number.isFinite(dt) || dt < 0) return;
		stepAutoSign(dt, {
			canAdvance: galaxyTravel.birth >= 1 && !galaxyTravel.busy,
			traveling: galaxyTravel.traveling || galaxyTravel.seek != null,
			handsOn: galaxyTravel.handsOn || galaxyTravel.dragging || now < galaxyTravel.wheelUntil
		});
	};
	autoClock = requestAnimationFrame(tick);
}
function flyLocked() {
	return galaxyTravel.birth < 1 || galaxyTravel.busy;
}
function flyIgnore(target) {
	if (!(target instanceof Element)) return false;
	return Boolean(target.closest("button, a, input, textarea, select, .sign-strip, .birth-chat"));
}
function trackPtr(e) {
	if (!("clientX" in e)) return;
	const w = window.innerWidth || 1;
	const h = window.innerHeight || 1;
	galaxyTravel.ptrX = Math.min(.5, Math.max(-.5, e.clientX / w - .5));
	galaxyTravel.ptrY = Math.min(.5, Math.max(-.5, e.clientY / h - .5));
	galaxyTravel.ptrOn = true;
}
function ensureFlyInput() {
	if (typeof window === "undefined" || flyBound) return;
	flyBound = true;
	let lastY = 0;
	const onDown = (e) => {
		if (flyLocked()) return;
		if (flyIgnore(e.target)) return;
		galaxyTravel.dragging = true;
		lastY = e.clientY;
		trackPtr(e);
		galaxyTravel.handsOn = true;
		if (e.button === 1) {
			e.preventDefault();
			galaxyTravel.hold = 1;
			galaxyTravel.moved = true;
			galaxyTravel.awaken = 1;
			noteControl();
		}
	};
	const onMove = (e) => {
		trackPtr(e);
		if (!galaxyTravel.dragging) return;
		if (flyLocked()) return;
		const dy = e.clientY - lastY;
		lastY = e.clientY;
		if (Math.abs(dy) < 1) return;
		galaxyTravel.hold = dy > 0 ? 1 : -1;
		galaxyTravel.moved = true;
		galaxyTravel.awaken = 1;
		noteControl();
	};
	const onUp = () => {
		galaxyTravel.dragging = false;
		galaxyTravel.hold = 0;
		galaxyTravel.handsOn = false;
	};
	const onWheel = (e) => {
		if (flyLocked()) return;
		if (flyIgnore(e.target)) return;
		e.preventDefault();
		const delta = e.deltaY;
		if (Math.abs(delta) < .2) return;
		galaxyTravel.hold = delta > 0 ? 1 : -1;
		galaxyTravel.moved = true;
		galaxyTravel.awaken = 1;
		galaxyTravel.wheelUntil = nowMs() + 180;
		noteControl();
	};
	window.addEventListener("pointerdown", onDown, { passive: false });
	window.addEventListener("pointermove", onMove, { passive: true });
	window.addEventListener("pointerup", onUp, { passive: true });
	window.addEventListener("pointercancel", onUp, { passive: true });
	window.addEventListener("wheel", onWheel, { passive: false });
}
/** One probe, then cache. Software GL (SwiftShader / llvmpipe) is a small GPU. */
var probed = false;
var webglOk = false;
var small = false;
var software = false;
var DPR_APPLE = Object.freeze([1, 1]);
var DPR_SMALL = Object.freeze([1, 1.15]);
var DPR_FULL = Object.freeze([1, 1.5]);
var SOFT_GPU = /swiftshader|llvmpipe|softpipe|microsoft basic render|software rasterizer|gdi generic/i;
function isAppleTouch() {
	if (typeof navigator === "undefined") return false;
	return /iP(hone|od|ad)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
function probe() {
	if (probed) return;
	probed = true;
	if (typeof document === "undefined") {
		webglOk = false;
		small = true;
		return;
	}
	const apple = isAppleTouch();
	const touchNarrow = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 && typeof window !== "undefined" && window.innerWidth < 720;
	if (apple) {
		webglOk = true;
		small = true;
		software = false;
		return;
	}
	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		const gl = canvas.getContext("webgl2", {
			failIfMajorPerformanceCaveat: false,
			alpha: true
		}) || canvas.getContext("webgl", {
			failIfMajorPerformanceCaveat: false,
			alpha: true
		});
		if (!gl) {
			webglOk = false;
			small = true;
			software = true;
			return;
		}
		webglOk = true;
		const info = gl.getExtension("WEBGL_debug_renderer_info");
		const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "") : "";
		software = SOFT_GPU.test(renderer);
		small = software || touchNarrow;
		canvas.width = 0;
		canvas.height = 0;
	} catch {
		webglOk = false;
		small = true;
		software = true;
	}
}
function isSmallGpu() {
	probe();
	return small;
}
function canWebGL() {
	probe();
	return webglOk;
}
function canvasDpr() {
	probe();
	if (isAppleTouch()) return DPR_APPLE;
	if (small) return DPR_SMALL;
	return DPR_FULL;
}
/** One sky everywhere. Width / touch used to force a 2D fork — that made the
*  phone (and the Grok preview pane) a different product. 2D is only the
*  tripwire after WebGL actually fails; we never remount a dead context. */
function shouldUse3D() {
	if (typeof window === "undefined" || typeof navigator === "undefined") return false;
	return canWebGL();
}
/** Transparent canvas so a lost context never composites as Safari-white. */
function glContextAttrs() {
	const modest = isSmallGpu() || isAppleTouch();
	return {
		alpha: true,
		antialias: !modest,
		depth: true,
		stencil: false,
		premultipliedAlpha: true,
		preserveDrawingBuffer: false,
		powerPreference: modest ? "low-power" : "default",
		failIfMajorPerformanceCaveat: false
	};
}
/** Hide a dead GL canvas before Safari paints it white. Never restore it. */
function buryWebGLCanvas(el) {
	if (!(el instanceof HTMLCanvasElement)) return;
	el.style.display = "none";
	el.style.visibility = "hidden";
	el.style.opacity = "0";
	el.style.background = "#0c0b0a";
	el.style.zIndex = "-1";
	try {
		el.width = 1;
		el.height = 1;
	} catch {}
}
/** Tropical sun-sign from calendar date (month 1–12). */
function sunSignOn(month, day) {
	const n = month * 100 + day;
	if (n >= 321 && n <= 419) return "aries";
	if (n >= 420 && n <= 520) return "taurus";
	if (n >= 521 && n <= 620) return "gemini";
	if (n >= 621 && n <= 722) return "cancer";
	if (n >= 723 && n <= 822) return "leo";
	if (n >= 823 && n <= 922) return "virgo";
	if (n >= 923 && n <= 1022) return "libra";
	if (n >= 1023 && n <= 1121) return "scorpio";
	if (n >= 1122 && n <= 1221) return "sagittarius";
	if (n >= 1222 || n <= 119) return "capricorn";
	if (n >= 120 && n <= 218) return "aquarius";
	return "pisces";
}
function monthLength(month, year) {
	if (year && year >= 1) return new Date(year, month, 0).getDate();
	if (month === 2) return 29;
	return new Date(2001, month, 0).getDate();
}
/** Calendar months the sun actually occupies for this sign. */
function monthsForSign(id) {
	const months = [];
	for (let m = 1; m <= 12; m++) if (daysForSign(id, m).length > 0) months.push(m);
	return months;
}
/** Days in `month` that belong to this sign. Year matters for Feb 29. */
function daysForSign(id, month, year) {
	if (month < 1 || month > 12) return [];
	const last = monthLength(month, year);
	const days = [];
	for (let d = 1; d <= last; d++) if (sunSignOn(month, d) === id) days.push(d);
	return days;
}
function isDateInSign(id, month, day) {
	return month >= 1 && day >= 1 && sunSignOn(month, day) === id;
}
function formatBirth(month, day, year) {
	return `${day} ${[
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	][month - 1] ?? ""} ${year}`;
}
var useVault = create((set, get) => ({
	entered: false,
	gate: "galaxy",
	chartId: null,
	mode: "sky",
	selection: null,
	hovered: null,
	chat: false,
	pickedSign: null,
	birth: null,
	openChart: (id) => set({
		chartId: id,
		entered: true,
		gate: "library",
		mode: "sky",
		selection: null,
		hovered: null,
		chat: false
	}),
	setChart: (id) => set({
		chartId: id,
		mode: "sky",
		selection: null,
		hovered: null
	}),
	openLibrary: () => set({
		gate: "library",
		entered: false,
		chartId: null,
		selection: null,
		hovered: null,
		chat: false
	}),
	openGalaxy: () => {
		resetTravel(false);
		useGalaxy.setState({
			born: true,
			moved: false,
			t: 0,
			signIndex: 0
		});
		set({
			gate: "galaxy",
			entered: false,
			chartId: null,
			selection: null,
			hovered: null,
			mode: "sky",
			chat: false,
			pickedSign: null,
			birth: null
		});
	},
	library: () => set({
		entered: false,
		chartId: null,
		selection: null,
		hovered: null,
		mode: "sky",
		gate: "library",
		chat: false
	}),
	openBirthChat: (sign) => {
		const i = CONSTELLATIONS.findIndex((c) => c.id === sign);
		if (i >= 0) seekSign(i);
		set({
			chat: true,
			pickedSign: sign,
			gate: "galaxy",
			birth: null
		});
	},
	closeBirthChat: () => set({
		chat: false,
		birth: null
	}),
	setBirth: (birth) => {
		const sign = get().pickedSign;
		if (sign && !isDateInSign(sign, birth.month, birth.day)) return;
		set({ birth });
	},
	setMode: (mode) => set({
		mode,
		selection: null,
		hovered: null
	}),
	select: (selection) => set({ selection }),
	hover: (hovered) => set({ hovered }),
	clear: () => set({ selection: null }),
	goBack: () => {
		const s = get();
		if (s.entered) {
			s.library();
			return;
		}
		if (s.chat) {
			s.closeBirthChat();
			return;
		}
		if (s.gate === "library") s.openGalaxy();
	}
}));
var LIBRARY = [{
	id: "saige",
	title: "Saige K",
	oneCut: "A fire face, a vault heart, a surgical mind.",
	date: "Monday, 26 July 2004"
}, {
	id: "joey",
	title: "Joey Devin Norris",
	oneCut: "Gemini rising, a Sagittarius sun in the 7th, an Aquarius moon.",
	date: "Monday, 13 December 1999"
}];
var SceneErrorBoundary = class extends import_react.Component {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error, info) {
		console.warn("scene failed", error, info.componentStack);
	}
	render() {
		if (this.state.failed) return this.props.fallback;
		return this.props.children;
	}
};
var MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];
function daysInMonth(month, year) {
	return new Date(year, month, 0).getDate();
}
function BirthChat() {
	const picked = useVault((s) => s.pickedSign);
	const birth = useVault((s) => s.birth);
	const setBirth = useVault((s) => s.setBirth);
	const openLibrary = useVault((s) => s.openLibrary);
	const closeBirthChat = useVault((s) => s.closeBirthChat);
	const sign = CONSTELLATIONS.find((c) => c.id === picked) ?? CONSTELLATIONS[0];
	const [month, setMonth] = (0, import_react.useState)("");
	const [day, setDay] = (0, import_react.useState)("");
	const [year, setYear] = (0, import_react.useState)("");
	const years = (0, import_react.useMemo)(() => {
		const y = (/* @__PURE__ */ new Date()).getFullYear();
		const out = [];
		for (let i = y; i >= 1926; i--) out.push(i);
		return out;
	}, []);
	const monthN = Number(month);
	const yearN = Number(year);
	const allowedMonths = monthsForSign(sign.id);
	const allowedDays = monthN ? daysForSign(sign.id, monthN, yearN || void 0) : [];
	const maxDay = monthN && yearN ? daysInMonth(monthN, yearN) : 31;
	const valid = monthN >= 1 && Number(day) >= 1 && yearN >= 1926 && isDateInSign(sign.id, monthN, Number(day));
	const sun = birth ? sunSignOn(birth.month, birth.day) : null;
	const sunName = sun ? CONSTELLATIONS.find((c) => c.id === sun)?.name : null;
	const submit = () => {
		if (!valid) return;
		setBirth({
			month: monthN,
			day: Number(day),
			year: yearN
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "vault-overlay pointer-events-none absolute inset-0 z-30 flex items-end justify-start md:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-bg from-25% via-bg/70 to-transparent md:bg-gradient-to-r md:from-bg md:from-20% md:via-bg/80 md:to-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "birth-chat pointer-events-auto relative w-full max-w-md px-6 pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-12",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-[0.28em] text-fg-muted uppercase",
					children: sign.month
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "mt-2 font-display text-4xl leading-[1.08] font-medium tracking-tight text-fg italic md:text-5xl",
					children: [sign.name, "."]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-sm text-sm leading-relaxed text-fg-muted md:text-base",
					children: sign.essence
				}),
				!birth ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-8 space-y-5",
					onSubmit: (e) => {
						e.preventDefault();
						submit();
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl tracking-tight text-fg italic",
							children: "When did you arrive?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "col-span-1 block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase",
										children: "Month"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: month,
										onChange: (e) => {
											setMonth(e.target.value);
											setDay("");
										},
										className: "min-h-11 w-full rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg",
										required: true,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "—"
										}), MONTHS.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: i + 1,
											disabled: !allowedMonths.includes(i + 1),
											children: m
										}, m))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "col-span-1 block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase",
										children: "Day"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: day,
										onChange: (e) => setDay(e.target.value),
										className: "min-h-11 w-full rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg",
										required: true,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "—"
										}), Array.from({ length: maxDay }, (_, i) => i + 1).filter((d) => !monthN || allowedDays.includes(d)).map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: d,
											children: d
										}, d))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "col-span-1 block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase",
										children: "Year"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: year,
										onChange: (e) => setYear(e.target.value),
										className: "min-h-11 w-full rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg",
										required: true,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "—"
										}), years.map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: y,
											children: y
										}, y))]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-wide text-fg-subtle",
							children: "Only the days the sun sat in that sign."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: !valid,
							className: "min-h-11 rounded-full border border-border bg-bg-elevated px-5 text-sm disabled:opacity-40",
							children: "Continue"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-fg-muted",
						children: [formatBirth(birth.month, birth.day, birth.year), sunName ? ` — the sun in ${sunName}.` : "."]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-full border border-accent bg-bg-elevated px-5 text-sm",
						onClick: () => {
							closeBirthChat();
							openLibrary();
						},
						children: "Enter the vault."
					})]
				})
			]
		})]
	});
}
function FallbackSky() {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		ensureAutoClock();
		ensureFlyInput();
		preloadSignArt();
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let raf = 0;
		let vel = CRUISE;
		let last = performance.now();
		const tick = (now) => {
			raf = requestAnimationFrame(tick);
			const dt = Math.min(.05, (now - last) / 1e3);
			last = now;
			const chatting = useVault.getState().chat;
			const entered = useVault.getState().entered;
			const birthing = !entered && galaxyTravel.birth < 1;
			if (stepBirth(dt)) useGalaxy.getState().markBorn();
			galaxyTravel.busy = chatting || entered || birthing;
			const hands = galaxyTravel.dragging || now < galaxyTravel.wheelUntil;
			galaxyTravel.handsOn = hands;
			const sought = stepSeek(galaxyTravel.t, dt);
			galaxyTravel.t = sought.t;
			const playing = stepPlayUntil(galaxyTravel.t);
			galaxyTravel.traveling = sought.active || playing;
			if (birthing) vel = 0;
			else if (chatting) vel *= Math.exp(-dt * 3.4);
			else if (hands || galaxyTravel.hold !== 0) {
				const want = galaxyTravel.hold !== 0 ? galaxyTravel.hold * HOLD_FLY : 0;
				if (want === 0) vel *= Math.exp(-dt * 2.6);
				else vel += (want - vel) * (1 - Math.exp(-dt * 4.2));
				vel = Math.max(-MAX_FLY, Math.min(MAX_FLY, vel));
				galaxyTravel.moved = true;
			} else vel += (CRUISE - vel) * (1 - Math.exp(-dt * .35));
			if (!birthing && !chatting && !entered) galaxyTravel.t += vel * dt;
			galaxyTravel.speed = vel;
			galaxyTravel.awaken = Math.min(1, Math.max(galaxyTravel.awaken, galaxyTravel.moved ? 1 : galaxyTravel.birth));
			useGalaxy.getState().setTravel(galaxyTravel.t, galaxyTravel.moved);
			const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
			const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
			ctx.fillStyle = "#0c0b0a";
			ctx.fillRect(0, 0, w, h);
			const t = galaxyTravel.t;
			const aim = aimedIndex(t);
			const near = nearestSign(t);
			for (let i = 0; i < 12; i++) {
				const along = alongToGate(t, i);
				const focused = i === aim || i === near;
				if (!focused && (along > 2.4 || along < -.4)) continue;
				const sign = CONSTELLATIONS[i];
				const art = signArtImage(sign.id);
				if (!(plateReady(sign.id) && art.complete && art.naturalWidth > 2)) continue;
				const z = Math.max(.08, .12 + Math.min(Math.max(along, .05), 1.14) * .55);
				const aspect = art.naturalWidth / Math.max(1, art.naturalHeight);
				const aw = Math.min(w, h) * (.92 / z) * .42;
				const ah = aw / aspect;
				ctx.save();
				ctx.globalAlpha = focused ? .95 : .55;
				ctx.drawImage(art, w / 2 - aw / 2, h / 2 - ah / 2 - 20, aw, ah);
				ctx.restore();
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "canvas-root",
		onClick: () => {
			if (galaxyTravel.birth < 1) {
				skipBirth();
				useGalaxy.getState().markBorn();
			}
		}
	});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function jumpTo(index) {
	return seekSign(index);
}
function nearestFromScroll(scroller) {
	const mid = scroller.scrollLeft + scroller.clientWidth / 2;
	let best = 0;
	let bestDist = Infinity;
	for (const node of scroller.querySelectorAll("[data-sign-index]")) {
		const i = Number(node.dataset.signIndex);
		const c = node.offsetLeft + node.offsetWidth / 2;
		const d = Math.abs(c - mid);
		if (d < bestDist) {
			bestDist = d;
			best = i;
		}
	}
	return best;
}
/** Horizontal snap-strip of the twelve. Swipe to jump the sky faster than cruise. */
function SignStrip() {
	const signIndex = useGalaxy((s) => s.signIndex);
	const moved = useGalaxy((s) => s.moved);
	const scrollerRef = (0, import_react.useRef)(null);
	const fromStrip = (0, import_react.useRef)(false);
	const programmatic = (0, import_react.useRef)(false);
	const settle = (0, import_react.useRef)(0);
	const mounted = (0, import_react.useRef)(false);
	const centerItem = (index, smooth) => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const item = scroller.querySelector(`[data-sign-index="${index}"]`);
		if (!item) return;
		programmatic.current = true;
		const left = item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2;
		scroller.scrollTo({
			left,
			behavior: smooth ? "smooth" : "instant"
		});
		window.clearTimeout(settle.current);
		settle.current = window.setTimeout(() => {
			programmatic.current = false;
			fromStrip.current = false;
		}, smooth ? 420 : 40);
	};
	(0, import_react.useEffect)(() => {
		const el = scrollerRef.current;
		if (!el) return;
		centerItem(useGalaxy.getState().signIndex, false);
		const onWheel = (e) => {
			if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
				e.preventDefault();
				el.scrollLeft += e.deltaY;
			}
			e.stopPropagation();
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);
	(0, import_react.useEffect)(() => {
		if (fromStrip.current) return;
		const smooth = mounted.current && moved;
		mounted.current = true;
		centerItem(signIndex, smooth);
	}, [signIndex, moved]);
	const onScroll = () => {
		if (programmatic.current) return;
		const el = scrollerRef.current;
		if (!el) return;
		fromStrip.current = true;
		const next = nearestFromScroll(el);
		if (next !== useGalaxy.getState().signIndex || !useGalaxy.getState().moved) jumpTo(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		ref: scrollerRef,
		className: "sign-strip",
		"aria-label": "The twelve signs",
		onScroll,
		onPointerDown: (e) => e.stopPropagation(),
		children: CONSTELLATIONS.map((c, i) => {
			const on = moved && i === signIndex;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "sign-strip-item",
				"data-sign-index": i,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-label": `${c.name}, ${c.month}`,
					"aria-pressed": on,
					"aria-current": on ? "true" : void 0,
					onClick: () => {
						fromStrip.current = true;
						jumpTo(i);
						centerItem(i, true);
					},
					className: cn("flex min-h-11 w-full flex-col items-center justify-center px-3 py-2", "transition-[color,opacity] duration-200 ease-out", on ? "text-fg" : "text-fg-subtle hover:text-fg-muted"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("font-display text-base tracking-tight italic md:text-lg", on && "text-accent"),
						children: c.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 text-xs tracking-wide",
						children: c.span
					})]
				})
			}, c.id);
		})
	});
}
function VaultApp() {
	const [Scene, setScene] = (0, import_react.useState)(null);
	const [sceneFailed, setSceneFailed] = (0, import_react.useState)(false);
	const entered = useVault((s) => s.entered);
	const gate = useVault((s) => s.gate);
	const chat = useVault((s) => s.chat);
	const born = useGalaxy((s) => s.born);
	const moved = useGalaxy((s) => s.moved);
	const sign = CONSTELLATIONS[useGalaxy((s) => s.signIndex)] ?? CONSTELLATIONS[0];
	useVault((s) => s.openLibrary);
	const openGalaxy = useVault((s) => s.openGalaxy);
	const openChart = useVault((s) => s.openChart);
	const goBack = useVault((s) => s.goBack);
	const openBirthChat = useVault((s) => s.openBirthChat);
	(0, import_react.useEffect)(() => {
		if (!shouldUse3D()) {
			setSceneFailed(true);
			return;
		}
		let cancelled = false;
		import("./ChartCanvas-MCt0_K2B.mjs").then((m) => {
			if (!cancelled && canWebGL()) setScene(() => m.ChartCanvas);
			else if (!cancelled) setSceneFailed(true);
		}).catch(() => {
			if (!cancelled) setSceneFailed(true);
		});
		const onLost = () => setSceneFailed(true);
		const hideLost = (e) => {
			const t = e.target;
			if (t instanceof HTMLCanvasElement && t.closest(".canvas-root")) buryWebGLCanvas(t);
		};
		window.addEventListener("vault-webgl-lost", onLost);
		window.addEventListener("webglcontextlost", hideLost, true);
		return () => {
			cancelled = true;
			window.removeEventListener("vault-webgl-lost", onLost);
			window.removeEventListener("webglcontextlost", hideLost, true);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (e.key === "Escape") {
				const st = useVault.getState();
				if (st.selection) st.clear();
				else st.goBack();
			}
			if (e.key === "Enter" && !useVault.getState().entered) {
				const st = useVault.getState();
				if (st.gate === "galaxy") {
					if (st.chat) return;
					if (galaxyTravel.birth < 1) {
						skipBirth();
						useGalaxy.getState().markBorn();
						return;
					}
					const g = useGalaxy.getState();
					if (g.moved) {
						const s = CONSTELLATIONS[g.signIndex];
						if (s) st.openBirthChat(s.id);
					} else st.openLibrary();
				}
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	(0, import_react.useEffect)(() => {
		ensureAutoClock();
		ensureFlyInput();
		window.__vault = {
			skipBirth,
			seekSign,
			galaxyTravel
		};
		const q = new URLSearchParams(window.location.search);
		if (q.has("skipBirth") || q.has("sign")) {
			skipBirth();
			useGalaxy.getState().markBorn();
			galaxyTravel.moved = true;
			galaxyTravel.awaken = 1;
		}
		const sign = q.get("sign");
		if (sign) {
			const i = CONSTELLATIONS.findIndex((c) => c.id === sign || String(c.name).toLowerCase() === sign.toLowerCase());
			if (i >= 0) seekSign(i);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		galaxyTravel.busy = Boolean(chat || entered);
	}, [chat, entered]);
	const showSky = gate === "galaxy" && !entered;
	const titleOn = showSky && born && !chat;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh min-h-full w-full overflow-hidden bg-bg text-fg",
		style: { background: "#0c0b0a" },
		children: [
			showSky && !sceneFailed && Scene && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SceneErrorBoundary, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FallbackSky, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scene, {})
			}),
			showSky && (sceneFailed || !Scene) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FallbackSky, {}),
			showSky && !chat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "vault-overlay pointer-events-none absolute inset-0 z-20 flex flex-col justify-between",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "galaxy-vignette pointer-events-none" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "px-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-center",
						children: [titleOn && !moved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "sign-soft font-display text-3xl tracking-tight text-fg italic md:text-5xl",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "word",
									children: "what's"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "word",
									children: "your"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "word",
									children: "sign"
								})
							]
						}), titleOn && moved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sign-swap",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs tracking-[0.28em] text-fg-muted uppercase",
									children: sign.month
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-2 font-display text-4xl tracking-tight text-fg italic md:text-6xl",
									children: sign.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mx-auto mt-3 max-w-md text-sm text-fg-muted md:text-base",
									children: sign.essence
								})
							]
						}, sign.id)]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "galaxy-chrome pointer-events-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]",
						children: [moved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-3 flex justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "rounded-full border border-border bg-bg-elevated/80 px-5 py-2 text-sm tracking-wide text-fg backdrop-blur-sm",
								onClick: () => openBirthChat(currentConstellation().id),
								children: "This is my sign"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignStrip, {})]
					})
				]
			}),
			chat && !entered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BirthChat, {}),
			(chat || entered || gate === "library") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "absolute top-[max(0.85rem,env(safe-area-inset-top))] left-4 z-40 flex items-center gap-2 text-sm text-fg-muted",
				onClick: goBack,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "inline-block h-3 w-3 rotate-45 border-t border-l border-accent"
				}), "Back"]
			}),
			gate === "library" && !entered && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "vault-overlay absolute inset-0 z-30 flex flex-col justify-end bg-bg/80 px-6 pb-16 backdrop-blur-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-[0.28em] text-fg-muted uppercase",
						children: "The Vault"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-2 font-display text-4xl italic",
						children: "Library"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-8 max-w-lg space-y-4",
						children: LIBRARY.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "w-full rounded-xl border border-border bg-bg-elevated px-5 py-4 text-left",
							onClick: () => openChart(item.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-display text-xl italic",
									children: item.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-sm text-fg-muted",
									children: item.oneCut
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-xs tracking-wide text-fg-subtle",
									children: item.date
								})
							]
						}) }, item.id))
					})
				]
			}),
			entered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "vault-overlay absolute inset-0 z-20 flex items-end bg-gradient-to-t from-bg via-bg/70 to-transparent px-6 pb-16",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-[0.28em] text-fg-muted uppercase",
						children: "The Vault"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-2 font-display text-4xl italic",
						children: "Natal temple"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-md text-sm text-fg-muted",
						children: "Sky, body, gates, machine, readings, bones, ask — recovered chart rooms live behind this door."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-6 text-sm text-fg-muted",
						onClick: openGalaxy,
						children: "Return to the sky"
					})
				] })
			})
		]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VaultApp, {});
}
//#endregion
export { loadSignArt as A, stepBirth as C, artAspect as D, useGalaxy as E, pairFigures as F, CONSTELLATIONS as M, constellationDust as N, artReady as O, nearestSign as P, starSpark as S, stepSeek as T, morphBurst as _, isSmallGpu as a, skipBirth as b, MAX_FLY as c, aimedIndex as d, alongToGate as f, gateForm as g, galaxyTravel as h, glContextAttrs as i, preloadSignArt as j, hydrateSignArt as k, PLAY_CRUISE as l, birthIgnite as m, useVault as n, CRUISE as o, birthBoom as p, canvasDpr as r, HOLD_FLY as s, routes_exports as t, SEEK_ARRIVE as u, prefersReducedMotion as v, stepPlayUntil as w, starGather as x, signMorph as y };
