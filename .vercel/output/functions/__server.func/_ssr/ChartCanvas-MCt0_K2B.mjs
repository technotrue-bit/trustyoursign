import { i as __toESM } from "../_runtime.mjs";
import { c as CanvasTexture, f as PerspectiveCamera, g as require_react, h as require_jsx_runtime, m as Vector3, n as useFrame, o as BufferAttribute, r as useThree, s as BufferGeometry, t as Canvas, u as Color } from "../_libs/@react-three/fiber+[...].mjs";
import { A as loadSignArt, C as stepBirth, D as artAspect, E as useGalaxy, F as pairFigures, M as CONSTELLATIONS, N as constellationDust, O as artReady, P as nearestSign, S as starSpark, T as stepSeek, _ as morphBurst, a as isSmallGpu, b as skipBirth, c as MAX_FLY, d as aimedIndex, f as alongToGate, g as gateForm, h as galaxyTravel, i as glContextAttrs, j as preloadSignArt, k as hydrateSignArt, l as PLAY_CRUISE, m as birthIgnite, n as useVault, o as CRUISE, p as birthBoom, r as canvasDpr, s as HOLD_FLY, u as SEEK_ARRIVE, v as prefersReducedMotion, w as stepPlayUntil, x as starGather, y as signMorph } from "./routes-tDKVJiq7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ChartCanvas-MCt0_K2B.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COUNT = 12;
var SMALL = typeof window !== "undefined" && isSmallGpu();
var STAR_N = SMALL ? 2800 : 6400;
var GALAXY_TINT = {
	fire: "#f3d5b0",
	earth: "#e6d7b8",
	air: "#dce6ef",
	water: "#cfd8ea"
};
var _look = new Vector3();
var _pos = new Vector3();
function pathAt(t, out) {
	out.set(Math.sin(t * .17) * 1.6, Math.cos(t * .11) * .85, -t * 50);
}
function makeSparkTexture() {
	const c = document.createElement("canvas");
	c.width = 64;
	c.height = 64;
	const ctx = c.getContext("2d");
	const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
	g.addColorStop(0, "rgba(255,248,236,1)");
	g.addColorStop(.18, "rgba(255,236,210,0.9)");
	g.addColorStop(.42, "rgba(255,220,180,0.28)");
	g.addColorStop(1, "rgba(255,220,180,0)");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 64, 64);
	const tex = new CanvasTexture(c);
	tex.needsUpdate = true;
	return tex;
}
function scatterStar(pos, i, z, tight) {
	const spreadX = tight ? 16 : 38;
	const spreadY = tight ? 9 : 22;
	pos.setXYZ(i, (Math.random() - .5) * spreadX, (Math.random() - .5) * spreadY * (Math.random() < .55 ? .5 : 1), z);
}
function StarField() {
	const points = (0, import_react.useRef)(null);
	const geo = (0, import_react.useMemo)(() => {
		const g = new BufferGeometry();
		const pos = new Float32Array(STAR_N * 3);
		const attr = new BufferAttribute(pos, 3);
		for (let i = 0; i < STAR_N; i++) scatterStar(attr, i, -Math.random() * 140, i % 5 !== 0);
		g.setAttribute("position", attr);
		return g;
	}, []);
	const spark = (0, import_react.useMemo)(() => makeSparkTexture(), []);
	(0, import_react.useEffect)(() => () => {
		geo.dispose();
		spark.dispose();
	}, [geo, spark]);
	useFrame(({ camera }) => {
		const mesh = points.current;
		if (!mesh) return;
		const mat = mesh.material;
		const b = galaxyTravel.birth;
		if (mat && !Array.isArray(mat) && "opacity" in mat) mat.opacity = .28 + b * .62;
		const pos = mesh.geometry.getAttribute("position");
		const cz = camera.position.z;
		if (!Number.isFinite(cz)) return;
		const far = cz - 120;
		const near = cz + 8;
		for (let i = 0; i < STAR_N; i++) {
			let z = pos.getZ(i);
			if (z > near) z = cz - 118 - Math.random() * 14;
			if (z < far) z = cz + 4 - Math.random() * 6;
			pos.setZ(i, z);
		}
		pos.needsUpdate = true;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("points", {
		ref: points,
		geometry: geo,
		frustumCulled: false,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pointsMaterial", {
			map: spark,
			color: "#fff6e8",
			size: SMALL ? 2.15 : 2.4,
			sizeAttenuation: true,
			transparent: true,
			depthWrite: false,
			opacity: .3,
			blending: 2,
			toneMapped: false,
			fog: true
		})
	});
}
function SignFigure({ index, data }) {
	const cores = (0, import_react.useRef)(null);
	const art = (0, import_react.useRef)(null);
	const nova = (0, import_react.useRef)(null);
	const group = (0, import_react.useRef)(null);
	const tint = (0, import_react.useMemo)(() => new Color(GALAXY_TINT[data.element]), [data.element]);
	const artTex = (0, import_react.useMemo)(() => loadSignArt(data.id), [data.id]);
	const spark = (0, import_react.useMemo)(() => makeSparkTexture(), []);
	const pairs = (0, import_react.useMemo)(() => pairFigures(data.animal, data.figure), [data.animal, data.figure]);
	const figureN = pairs.length;
	const dustN = SMALL ? 14 : 22;
	const n = figureN + dustN;
	const dust = (0, import_react.useMemo)(() => constellationDust(index, dustN), [index, dustN]);
	const scatter = (0, import_react.useMemo)(() => {
		return Array.from({ length: n }, (_, i) => {
			const a = index * 1.73 + i * 2.399;
			const b = index * .91 + i * 1.618;
			const r = 12.5 + i % 7 * 2.8;
			return new Vector3(Math.cos(a) * r, Math.sin(b) * (7.4 + i % 5 * 1.1), Math.sin(a) * r * .82);
		});
	}, [n, index]);
	const starGeo = (0, import_react.useMemo)(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
		g.setAttribute("color", new BufferAttribute(new Float32Array(n * 3), 3));
		return g;
	}, [n]);
	const pick = () => useVault.getState().openBirthChat(data.id);
	(0, import_react.useEffect)(() => {
		return () => {
			spark.dispose();
			starGeo.dispose();
		};
	}, [spark, starGeo]);
	useFrame(({ camera, clock }) => {
		const mesh = cores.current;
		const g = group.current;
		if (!mesh || !g) return;
		hydrateSignArt(data.id, artTex);
		const held = useVault.getState().chat && useVault.getState().pickedSign === data.id;
		const along = held ? .42 : alongToGate(galaxyTravel.t, index);
		const nIdx = nearestSign(galaxyTravel.t);
		const incoming = index === (nIdx + 1) % COUNT;
		const focused = held || index === aimedIndex() || index === nIdx;
		pathAt(index, g.position);
		g.quaternion.copy(camera.quaternion);
		const local = held ? 1 : gateForm(along, index, galaxyTravel.t);
		const form = Math.max(local, focused && along < 2.9 && along > -.35 ? .97 : incoming && along < 2.1 && along > .15 ? .78 : 0) * Math.max(galaxyTravel.awaken, held || focused || incoming ? 1 : 0);
		const cinematic = !held && galaxyTravel.playUntil != null;
		const morph = held ? 1 : cinematic ? signMorph(along) : focused ? Math.min(signMorph(along), .35) : 0;
		const burst = held ? 0 : cinematic ? morphBurst(along) : 0;
		const plateOn = artReady(artTex);
		if (form < .008 && !held && !focused && !incoming) {
			mesh.visible = false;
			if (art.current) art.current.visible = false;
			if (nova.current) nova.current.visible = false;
			return;
		}
		mesh.visible = true;
		const pos = mesh.geometry.getAttribute("position");
		const col = mesh.geometry.getAttribute("color");
		const time = clock.elapsedTime;
		for (let i = 0; i < n; i++) {
			const isDust = i >= figureN;
			const gather = starGather(along, i, n);
			const sc = scatter[i];
			let x;
			let y;
			let z;
			let mag;
			if (isDust) {
				const d = dust[i - figureN];
				mag = d.mag;
				if (form < .18 || morph < .12) {
					pos.setXYZ(i, 0, 80, 0);
					col.setXYZ(i, 0, 0, 0);
					continue;
				}
				x = d.x;
				y = d.y;
				z = (i % 3 - 1) * .16;
			} else {
				const p = pairs[i];
				mag = p.am + (p.gm - p.am) * morph;
				const fx = (p.ax + (p.gx - p.ax) * morph) * 1.08;
				const fy = (p.ay + (p.gy - p.ay) * morph) * 1.08;
				const kick = 1 + burst * .82;
				x = fx * gather * kick + sc.x * (1 - gather);
				y = fy * gather * kick + sc.y * (1 - gather);
				z = sc.z * (1 - gather) * .4;
			}
			pos.setXYZ(i, x, y, z);
			const sparkle = starSpark(time, i, index * 1.7);
			const b = Math.min(1.18, sparkle * (.5 + mag * .55) * (.35 + form * .75 + burst * .28));
			const lift = .58 + mag * .42;
			col.setXYZ(i, tint.r * lift * b, tint.g * lift * b, tint.b * lift * b);
		}
		pos.needsUpdate = true;
		col.needsUpdate = true;
		if (art.current) {
			const mat = art.current.material;
			const show = (focused || incoming || held) && along > -.55 && along < 2.6 && plateOn;
			art.current.visible = show;
			art.current.frustumCulled = false;
			art.current.renderOrder = 10;
			if (show) {
				const aspect = artAspect(artTex);
				const wide = (SMALL ? 22.5 : 19.4) + Math.min(Math.max(along, 0), 1.2) * 1.6;
				art.current.scale.set(wide, wide / aspect, 1);
				mat.opacity = focused || held ? 1 : incoming ? .72 : .9;
				mat.map = artTex;
				mat.depthTest = false;
				mat.depthWrite = false;
				mat.needsUpdate = true;
			} else mat.opacity = 0;
		}
		if (nova.current) {
			nova.current.visible = burst > .04;
			nova.current.scale.setScalar(6.2 + burst * 20);
			const nm = nova.current.material;
			nm.opacity = burst * .58;
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		ref: group,
		frustumCulled: false,
		onClick: (e) => {
			e.stopPropagation();
			pick();
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				ref: art,
				position: [
					0,
					.05,
					-.06
				],
				visible: false,
				renderOrder: 10,
				frustumCulled: false,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [1, 1] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					map: artTex,
					color: "#ffffff",
					transparent: true,
					opacity: 0,
					depthWrite: false,
					depthTest: false,
					fog: false,
					toneMapped: false,
					side: 2
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				ref: nova,
				position: [
					0,
					0,
					-.2
				],
				visible: false,
				renderOrder: 5,
				frustumCulled: false,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [1, 1] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					map: spark,
					color: tint,
					transparent: true,
					opacity: 0,
					depthWrite: false,
					blending: 2,
					fog: false,
					toneMapped: false
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("points", {
				ref: cores,
				geometry: starGeo,
				frustumCulled: false,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pointsMaterial", {
					map: spark,
					vertexColors: true,
					size: SMALL ? 3.1 : 2.6,
					sizeAttenuation: true,
					transparent: true,
					depthWrite: false,
					blending: 2,
					toneMapped: false,
					fog: false
				})
			})
		]
	});
}
function GalaxyRig() {
	const { camera } = useThree();
	const vel = (0, import_react.useRef)(0);
	const booted = (0, import_react.useRef)(false);
	useFrame((_, dt) => {
		const d = Math.min(.05, Math.max(.008, dt));
		const chatting = useVault.getState().chat;
		const entered = useVault.getState().entered;
		const birthing = !entered && galaxyTravel.birth < 1;
		if (stepBirth(d)) useGalaxy.getState().markBorn();
		else if (galaxyTravel.birth >= 1) useGalaxy.getState().markBorn();
		galaxyTravel.busy = chatting || entered || birthing;
		const hands = galaxyTravel.dragging || performance.now() < galaxyTravel.wheelUntil;
		galaxyTravel.handsOn = hands || galaxyTravel.hold !== 0;
		if (!booted.current) {
			booted.current = true;
			galaxyTravel.t = prefersReducedMotion() ? 0 : galaxyTravel.t;
		}
		const sought = stepSeek(galaxyTravel.t, d);
		galaxyTravel.t = sought.t;
		const playing = stepPlayUntil(galaxyTravel.t);
		galaxyTravel.traveling = sought.active || playing || galaxyTravel.seek != null;
		if (birthing) vel.current = 0;
		else if (chatting) {
			vel.current *= Math.exp(-d * 3.4);
			if (Math.abs(vel.current) < .03) vel.current = 0;
		} else if (sought.active) vel.current *= Math.exp(-d * 2.2);
		else if ((hands || galaxyTravel.hold !== 0) && !entered) {
			const want = galaxyTravel.hold !== 0 ? galaxyTravel.hold * HOLD_FLY : galaxyTravel.ptrY > .08 ? HOLD_FLY : galaxyTravel.ptrY < -.08 ? -HOLD_FLY : 0;
			if (want === 0) vel.current *= Math.exp(-d * 2.6);
			else vel.current += (want - vel.current) * (1 - Math.exp(-d * 4.2));
			vel.current = Math.max(-MAX_FLY, Math.min(MAX_FLY, vel.current));
			galaxyTravel.moved = true;
			galaxyTravel.awaken = 1;
		} else if (playing) vel.current += (PLAY_CRUISE - vel.current) * (1 - Math.exp(-d * .55));
		else vel.current += (CRUISE - vel.current) * (1 - Math.exp(-d * .35));
		if (!birthing && !chatting && !entered) {
			galaxyTravel.t += vel.current * d;
			if (Math.abs(vel.current) > .02) galaxyTravel.moved = true;
		}
		galaxyTravel.speed = vel.current;
		if (galaxyTravel.moved) galaxyTravel.awaken = Math.min(1, galaxyTravel.awaken + d * .7);
		pathAt(galaxyTravel.t, _pos);
		camera.position.lerp(_pos, 1);
		pathAt(galaxyTravel.t + .35, _look);
		camera.lookAt(_look);
		if (camera instanceof PerspectiveCamera) {
			if (camera.far < 320) {
				camera.far = 320;
				camera.updateProjectionMatrix();
			}
			const b = galaxyTravel.birth;
			const burst = chatting ? 0 : morphBurst(alongToGate(galaxyTravel.t, nearestSign(galaxyTravel.t)));
			const fovWant = birthing ? 54 + birthIgnite(b) * 4 + birthBoom(b) * 5.5 : chatting ? 56 : 58 + Math.min(4, Math.abs(vel.current) * 2.2) + burst * 2.6;
			if (Math.abs(camera.fov - fovWant) > .05) {
				camera.fov += (fovWant - camera.fov) * (1 - Math.exp(-d * 4));
				camera.updateProjectionMatrix();
			}
		}
		useGalaxy.getState().setTravel(galaxyTravel.t, galaxyTravel.moved);
	});
	return null;
}
function SceneClick() {
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (e.key === "Enter" && galaxyTravel.birth < 1) {
				skipBirth();
				useGalaxy.getState().markBorn();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	return null;
}
function GalaxyIntro() {
	(0, import_react.useEffect)(() => {
		preloadSignArt();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Canvas, {
		className: "canvas-root",
		dpr: canvasDpr(),
		gl: glContextAttrs(),
		camera: {
			position: [
				0,
				0,
				SEEK_ARRIVE * 50
			],
			fov: 58,
			near: .1,
			far: 320
		},
		onCreated: ({ gl }) => {
			gl.setClearColor("#0c0b0a", 0);
		},
		onPointerMissed: () => {
			if (galaxyTravel.birth < 1) {
				skipBirth();
				useGalaxy.getState().markBorn();
			}
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("color", {
				attach: "background",
				args: ["#0c0b0a"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("fog", {
				attach: "fog",
				args: [
					"#0c0b0a",
					31,
					180
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SceneClick, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GalaxyRig, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StarField, {}),
			CONSTELLATIONS.map((data, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignFigure, {
				index,
				data
			}, data.id))
		]
	});
}
function ChartCanvas() {
	if (useVault((s) => s.entered)) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GalaxyIntro, {});
}
//#endregion
export { ChartCanvas };
