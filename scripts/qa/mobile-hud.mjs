/**
 * Phone HUD audit — every public view on an emulated iPhone frame.
 *
 * Safe-area insets come from CDP (`Emulation.setSafeAreaInsetsOverride`), so
 * `env(safe-area-inset-*)` resolves to real values. Safari's bottom bar is
 * modelled as the shorter web view it leaves: this site is a fixed,
 * non-scrolling shell, so iOS clips it at the bar's top edge and reports a
 * bottom inset of 0 there. Full-bleed profiles (home-screen app / collapsed
 * bar) keep the whole screen with a 34px home-indicator inset.
 *
 * Per view it reports: labels / controls whose boxes intersect, anything
 * inside the status-bar / Dynamic Island band, anything inside the home
 * indicator band or hugging the Safari bar, hit targets under 44px, and
 * controls whose centre `elementFromPoint` hands to something else.
 *
 *   node scripts/qa/mobile-hud.mjs [outDir] [--profiles a,b] [--views x,y] [--proof mediaDir]
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const outDir = args[0] && !args[0].startsWith("--") ? args[0] : "screenshots/mobile-hud";
const proofDir = flag("--proof");

/** Safari (bar shown) web view: screen height minus the ~98px floating bar zone. */
const PROFILES = {
  "safari-390": { w: 390, h: 746, top: 47, bottom: 0, screen: 844, mobile: true },
  "bleed-390": { w: 390, h: 844, top: 47, bottom: 34, mobile: true },
  "island-390": { w: 390, h: 844, top: 59, bottom: 34, mobile: true },
  "safari-430": { w: 430, h: 834, top: 59, bottom: 0, screen: 932, mobile: true },
  "bleed-430": { w: 430, h: 932, top: 59, bottom: 34, mobile: true },
  ipad: { w: 820, h: 1180, top: 24, bottom: 20, mobile: true },
  desktop: { w: 1440, h: 900, top: 0, bottom: 0, mobile: false },
};

const VIEWS = {
  intro: { path: "/", sky: "intro" },
  aries: { path: "/", sky: "aries" },
  inside: { path: "/", sky: "inside" },
  cookie: { path: "/", sky: "aries", cookie: true },
  "inside-cookie": { path: "/", sky: "inside", cookie: true },
  "aries-auth": { path: "/", sky: "aries", auth: true },
  login: { path: "/login", scroll: true },
  account: { path: "/account", scroll: true, auth: true },
  about: { path: "/about", scroll: true },
  how: { path: "/how-this-works", scroll: true },
  faq: { path: "/faq", scroll: true },
  contact: { path: "/contact", scroll: true },
  privacy: { path: "/privacy", scroll: true },
  terms: { path: "/terms", scroll: true },
};

const pick = (list, all) => (list ? list.split(",").filter((k) => k in all) : Object.keys(all));
const profileNames = pick(flag("--profiles"), PROFILES);
const viewNames = pick(flag("--views"), VIEWS);

await mkdir(outDir, { recursive: true });
if (proofDir) await mkdir(proofDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

/** Runs in the page. Returns every visible label / control and what collides. */
function measure(p) {
  const { top, bottom, w, h } = p;
  const effOpacity = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return 0;
      o *= Number(cs.opacity);
    }
    return o;
  };
  const labelOf = (el, text) => {
    const t = (text ?? el.getAttribute("aria-label") ?? el.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();
    return t.slice(0, 48) || `<${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}>`;
  };
  const folded = (el) => {
    const d = el.closest("details:not([open])");
    return Boolean(d && !el.closest("summary"));
  };
  /** Box as painted: cut to every overflow-clipping ancestor (scrollers, the strip). */
  const clipped = (el, r) => {
    let { left, top: t, right, bottom: b } = r;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const c = n.getBoundingClientRect();
      if (cs.overflowX !== "visible") {
        left = Math.max(left, c.left);
        right = Math.min(right, c.right);
      }
      if (cs.overflowY !== "visible") {
        t = Math.max(t, c.top);
        b = Math.min(b, c.bottom);
      }
    }
    return new DOMRect(left, t, Math.max(0, right - left), Math.max(0, b - t));
  };
  const inView = (r) =>
    r.right > 0 && r.left < w && r.bottom > 0 && r.top < h && r.width > 1 && r.height > 1;
  const box = (r) => ({
    x: Math.round(r.left),
    y: Math.round(r.top),
    w: Math.round(r.width),
    h: Math.round(r.height),
    b: Math.round(r.bottom),
    r: Math.round(r.right),
  });

  const items = [];
  const CONTROL = "a[href],button,summary,[role=button],input:not([type=hidden]),select,textarea";
  for (const el of document.querySelectorAll(CONTROL)) {
    if (el.closest("[inert]") || el.closest("[data-qa-overlay]") || folded(el)) continue;
    if (getComputedStyle(el).pointerEvents === "none") continue;
    const r = clipped(el, el.getBoundingClientRect());
    if (!inView(r) || effOpacity(el) < 0.05) continue;
    const host = el.parentElement?.closest("p,li");
    const inline =
      el.tagName === "A" &&
      host != null &&
      (host.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 3;
    items.push({ el, kind: "control", label: labelOf(el), rect: r, inline });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent || !n.textContent.trim()) continue;
    const parent = n.parentElement;
    if (
      !parent ||
      parent.closest("script,style,noscript,[data-qa-overlay],[inert]") ||
      folded(parent)
    )
      continue;
    const pr = parent.getBoundingClientRect();
    if (pr.width <= 1 || pr.height <= 1) continue;
    if (effOpacity(parent) < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()]
      .map((r) => clipped(parent, r))
      .filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const u = rects.reduce(
      (a, r) => ({
        left: Math.min(a.left, r.left),
        top: Math.min(a.top, r.top),
        right: Math.max(a.right, r.right),
        bottom: Math.max(a.bottom, r.bottom),
      }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    );
    const r = new DOMRect(u.left, u.top, u.right - u.left, u.bottom - u.top);
    if (!inView(r)) continue;
    // A clipped overflow parent (the sign strip) hides text outside its box.
    items.push({
      el: parent,
      kind: "text",
      label: labelOf(parent, n.textContent),
      rect: r,
      lines: rects,
    });
  }

  const overlaps = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const ix = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const iy = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (ix <= 0.5 || iy <= 0.5) continue;
      // Text boxes: compare line boxes, not the union of a wrapped paragraph.
      if (a.lines && b.lines) {
        const hit = a.lines.some((la) =>
          b.lines.some(
            (lb) =>
              Math.min(la.right, lb.right) - Math.max(la.left, lb.left) > 0.5 &&
              Math.min(la.bottom, lb.bottom) - Math.max(la.top, lb.top) > 0.5,
          ),
        );
        if (!hit) continue;
      }
      overlaps.push({
        a: `${a.kind}:${a.label}`,
        b: `${b.kind}:${b.label}`,
        px: `${Math.round(ix)}×${Math.round(iy)}`,
      });
    }
  }

  const island = { left: w / 2 - 63, right: w / 2 + 63, bottom: 48 };
  // A fixed scrim over the status-bar band hides document text scrolling under it.
  const page = document.querySelector("main.vault-page");
  const scrimCss = page ? getComputedStyle(page, "::before") : null;
  const scrim =
    scrimCss && scrimCss.content !== "none" && scrimCss.position === "fixed"
      ? Number.parseFloat(scrimCss.height) || 0
      : 0;
  const underTop = [];
  const underBottom = [];
  const hugBar = [];
  for (const it of items) {
    const r = it.rect;
    if (top > 0 && r.top < top && scrim < top) {
      const inIsland =
        r.bottom > 11 && r.top < island.bottom && r.right > island.left && r.left < island.right;
      underTop.push({
        item: `${it.kind}:${it.label}`,
        px: Math.round(top - r.top),
        island: inIsland,
      });
    }
    if (bottom > 0 && r.bottom > h - bottom) {
      underBottom.push({ item: `${it.kind}:${it.label}`, px: Math.round(r.bottom - (h - bottom)) });
    }
    if (p.screen && h - r.bottom < 12) {
      hugBar.push({ item: `${it.kind}:${it.label}`, gap: Math.round(h - r.bottom) });
    }
  }

  /** Box plus any absolutely positioned ::after tap cell drawn around it. */
  const hitBox = (el, r) => {
    const a = getComputedStyle(el, "::after");
    if (a.content === "none" || a.position !== "absolute") return r;
    const px = (v) => (v.endsWith("px") ? Number.parseFloat(v) : 0);
    const left = r.left + Math.min(0, px(a.left));
    const right = r.right - Math.min(0, px(a.right));
    const topY = r.top + Math.min(0, px(a.top));
    const bottomY = r.bottom - Math.min(0, px(a.bottom));
    return new DOMRect(left, topY, right - left, bottomY - topY);
  };
  const small = [];
  const covered = [];
  for (const it of items) {
    if (it.kind !== "control") continue;
    const full = it.el.getBoundingClientRect();
    // Size is judged on controls fully on screen; a half-scrolled one is not small.
    const whole = it.rect.width >= full.width - 1 && it.rect.height >= full.height - 1;
    // A wrapped inline link: aim at its first line, not the gap between lines.
    const lines = it.el.getClientRects();
    const r = lines.length > 1 ? clipped(it.el, lines[0]) : it.rect;
    const hb = hitBox(it.el, full);
    if (whole && (hb.width < 43.5 || hb.height < 43.5)) {
      small.push({
        item: it.label,
        size: `${Math.round(hb.width)}×${Math.round(hb.height)}`,
        inline: it.inline,
      });
    }
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // Half-scrolled strip items sit under the edge mask on purpose.
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(hit === it.el || it.el.contains(hit))) {
      covered.push({
        item: it.label,
        at: `${Math.round(cx)},${Math.round(cy)}`,
        by: hit
          ? `<${hit.tagName.toLowerCase()} class="${String(hit.className).slice(0, 60)}">`
          : "nothing",
      });
    }
  }

  // Named HUD pieces the oracle is written against.
  const q = (sel, textRange = false) => {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!el) return null;
    if (effOpacity(el) < 0.05) return null;
    let r = el.getBoundingClientRect();
    if (textRange) {
      const range = document.createRange();
      range.selectNodeContents(el);
      r = range.getBoundingClientRect();
    }
    return r.width > 1 ? box(r) : null;
  };
  const byText = (sel, re) =>
    [...document.querySelectorAll(sel)].find((el) => re.test(el.textContent ?? ""));
  const named = {
    beta: q(".vault-overlay p[aria-label]", true),
    pause: q(byText("button", /^(Pause|Resume)$/)),
    signIn: q(".auth-sign-in") ?? q('button[aria-label="Account"]'),
    date: q(".sign-swap > p:first-child", true),
    title: q(".galaxy-sign-name", true) ?? q(".galaxy-title", true),
    tagline: q(".sign-swap > p:last-child", true),
    footer: q(".sky-hud-footer"),
    cookie:
      q(".cookie-notice-glow")?.y != null ? q(byText(".galaxy-chrome div", /One cookie/)) : null,
    strip: q(".sign-strip-belt"),
    enter: q(byText("button", /^Enter this sign$/)),
    hint: q(".galaxy-chrome > p.sky-hud-kicker", true),
    chartTalks: q(".chart-talks > summary"),
    chartTalksText: q(".chart-talks > summary", true),
    back: q(byText("button", /^Back$/)),
    starCount: q(byText("p", /^Star \d+ of \d+$/), true),
    insideTitle: q(".sign-galaxy-lower h3", true) ?? null,
    insideTop: q(".sign-galaxy-lower"),
    scroller: q(".sign-galaxy-scroll"),
    dots: q(".sign-galaxy-dots"),
    begin: q(byText("button", /^Begin birth chart$/)),
  };
  const centreHit = (name, sel) => {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!el || el.closest("[inert]") || effOpacity(el) < 0.05) return null;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      name,
      own: Boolean(hit && (hit === el || el.contains(hit))),
      size: `${Math.round(r.width)}×${Math.round(r.height)}`,
    };
  };
  const hits = [
    centreHit("enter", byText("button", /^Enter this sign$/)),
    centreHit(
      "signIn",
      document.querySelector(".auth-sign-in") ??
        document.querySelector('button[aria-label="Account"]'),
    ),
    centreHit("pause", byText("button", /^(Pause|Resume)$/)),
    centreHit("chartTalks", ".chart-talks > summary"),
    centreHit("back", byText("button", /^Back$/)),
    centreHit("begin", byText("button", /^Begin birth chart$/)),
  ].filter(Boolean);
  const scroller = document.querySelector(".sign-galaxy-scroll");
  const scroll = scroller
    ? {
        client: scroller.clientHeight,
        content: scroller.scrollHeight,
        takesTouch: getComputedStyle(scroller).pointerEvents !== "none",
      }
    : null;

  return {
    counts: { items: items.length, controls: items.filter((i) => i.kind === "control").length },
    overlaps,
    underTop,
    underBottom,
    hugBar,
    small,
    covered,
    named,
    hits,
    scroll,
    scrim: Math.round(scrim),
    marks: {
      overlap: [...new Set(overlaps.flatMap((o) => [o.a, o.b]))],
      small: small.filter((s) => !s.inline).map((s) => s.item),
    },
    rects: items.map((it) => ({ key: `${it.kind}:${it.label}`, kind: it.kind, ...box(it.rect) })),
  };
}

/** Draws inset bands and flagged boxes over the page for the annotated shot. */
function annotate({ p, result }) {
  const layer = document.createElement("div");
  layer.dataset.qaOverlay = "1";
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;";
  const add = (css) => {
    const d = document.createElement("div");
    d.style.cssText = `position:absolute;box-sizing:border-box;${css}`;
    layer.appendChild(d);
  };
  if (p.top)
    add(
      `left:0;right:0;top:0;height:${p.top}px;background:rgba(255,140,0,.22);border-bottom:1px dashed #ff8c00;`,
    );
  if (p.bottom)
    add(
      `left:0;right:0;bottom:0;height:${p.bottom}px;background:rgba(255,140,0,.22);border-top:1px dashed #ff8c00;`,
    );
  const flagged = new Set(result.marks.overlap);
  const small = new Set(result.marks.small.map((s) => `control:${s}`));
  for (const r of result.rects) {
    if (flagged.has(r.key))
      add(`left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border:2px solid #ff2d55;`);
    else if (small.has(r.key))
      add(`left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border:1px dashed #36c5ff;`);
  }
  document.body.appendChild(layer);
}

async function settleSky(page, view) {
  await page.waitForSelector("canvas", { timeout: 40_000 }).catch(() => {});
  await page
    .waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 40_000 })
    .catch(() => {});
  if (view.sky === "intro") {
    await page.evaluate(() => window.__tysQa?.ready({ moved: false }));
    await page.waitForTimeout(3500);
    return;
  }
  await page.evaluate(() => window.__tysQa?.ready());
  await page.evaluate(() => window.__tysQa?.parkAt(0));
  await page.waitForTimeout(4500);
  if (view.sky !== "inside") return;
  await page.evaluate(() => window.__tysQa?.enter(0));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__tysQa?.skip());
  await page
    .waitForFunction(() => window.__tysQa?.state().phase === "inside", null, { timeout: 30_000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
}

async function scrollMain(page, to) {
  return page.evaluate((where) => {
    const main = document.querySelector("main.vault-page") ?? document.scrollingElement;
    if (!main) return { max: 0 };
    main.scrollTop = where === "end" ? main.scrollHeight : 0;
    return { max: main.scrollHeight - main.clientHeight, at: main.scrollTop };
  }, to);
}

/** Phone chrome around a Safari / full-bleed frame so the proof reads like the device. */
async function phoneComposite(png, p, out) {
  const screenH = p.screen ?? p.h;
  const page = await browser.newPage({
    viewport: { width: p.w, height: screenH },
    deviceScaleFactor: 2,
  });
  const b64 = png.toString("base64");
  const bar = p.screen
    ? `<div style="position:absolute;left:0;right:0;top:${p.h}px;bottom:0;background:#0b0a09">
         <div style="position:absolute;left:14px;right:14px;top:24px;height:50px;display:flex;gap:10px;align-items:center">
           <div style="width:50px;height:50px;border-radius:50%;background:rgba(58,54,50,.92);display:grid;place-items:center;color:#f2f2f2;font-size:22px">‹</div>
           <div style="flex:1;height:50px;border-radius:25px;background:rgba(58,54,50,.92);display:flex;align-items:center;justify-content:center;color:#f2f2f2;font:500 17px -apple-system,system-ui,sans-serif">trustyoursign.com</div>
           <div style="width:50px;height:50px;border-radius:50%;background:rgba(58,54,50,.92)"></div>
         </div>
         <div style="position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:#f2f2f2"></div>
       </div>`
    : `<div style="position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:rgba(242,242,242,.9)"></div>`;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000;overflow:hidden">
    <div style="position:relative;width:${p.w}px;height:${screenH}px;overflow:hidden">
      <img src="data:image/png;base64,${b64}" style="position:absolute;top:0;left:0;width:${p.w}px;height:${p.h}px">
      <div style="position:absolute;top:0;left:0;right:0;height:${p.top}px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;color:#fff;font:600 17px -apple-system,system-ui,sans-serif">
        <span>10:49</span><span style="font-size:13px">5G ▮▮</span>
      </div>
      <div style="position:absolute;top:11px;left:50%;width:126px;height:37px;margin-left:-63px;border-radius:19px;background:#000"></div>
      ${bar}
    </div></body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: out });
  await page.close();
}

/** One sign-in for the whole run — the auth rate limit trips on repeats. */
let authState = null;
if (viewNames.some((v) => VIEWS[v].auth)) {
  const ctx = await browser.newContext();
  // Dev-database QA account; sign-up is a no-op once it exists.
  const creds = {
    email: "hud-audit@example.com",
    password: "hud-audit-pass-123",
    name: "Hud Audit",
  };
  const headers = { origin: BASE };
  await ctx.request
    .post(`${BASE}/api/auth/sign-up/email`, { data: creds, headers })
    .catch(() => {});
  const res = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { data: creds, headers });
  if (!res.ok()) process.stderr.write(`[auth] sign-in ${res.status()}\n`);
  authState = await ctx.storageState();
  await ctx.close();
}

const report = {};
for (const pName of profileNames) {
  const p = PROFILES[pName];
  report[pName] = {};
  for (const vName of viewNames) {
    const view = VIEWS[vName];
    if (!p.mobile && !["aries", "inside", "cookie", "intro", "about", "login"].includes(vName))
      continue;
    const context = await browser.newContext({
      viewport: { width: p.w, height: p.h },
      deviceScaleFactor: p.mobile ? 2 : 1,
      isMobile: p.mobile,
      hasTouch: p.mobile,
      storageState: view.auth && authState ? authState : undefined,
    });
    if (!view.cookie) {
      await context.addInitScript(() => {
        try {
          sessionStorage.setItem("vaultCookieNotice", "1");
        } catch {
          /* ignore */
        }
      });
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 200));
    });
    const cdp = await context.newCDPSession(page);
    await cdp
      .send("Emulation.setSafeAreaInsetsOverride", {
        insets: { top: p.top, bottom: p.bottom, left: 0, right: 0 },
      })
      .catch((e) => errors.push(`[cdp] ${e.message}`));
    await page.goto(`${BASE}${view.path}`, { waitUntil: "domcontentloaded" });
    if (view.sky) await settleSky(page, view);
    else await page.waitForTimeout(3500);
    const url = page.url().replace(BASE, "");
    const env = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);left:0;width:1px;visibility:hidden";
      document.body.appendChild(probe);
      const r = probe.getBoundingClientRect();
      probe.remove();
      return { safeTop: Math.round(r.top), safeBottom: Math.round(innerHeight - r.bottom) };
    });
    const key = `${pName}--${vName}`;
    const clean = await page.screenshot({ animations: "allow", timeout: 30_000 }).catch(() => null);
    if (clean) await writeFile(`${outDir}/${key}.png`, clean);
    const result = await page.evaluate(measure, p);
    let end = null;
    if (view.scroll) {
      const s = await scrollMain(page, "end");
      if (s.max > 4) {
        await page.waitForTimeout(250);
        end = await page.evaluate(measure, p);
        end.scroll = s;
        await page.evaluate(annotate, { p, result: end });
        await page
          .screenshot({ path: `${outDir}/${key}--end-annotated.png`, timeout: 30_000 })
          .catch(() => {});
        await page.evaluate(() => document.querySelector("[data-qa-overlay]")?.remove());
      }
      await scrollMain(page, "top");
      await page.waitForTimeout(200);
    }
    await page.evaluate(annotate, { p, result });
    await page
      .screenshot({ path: `${outDir}/${key}--annotated.png`, timeout: 30_000 })
      .catch(() => {});
    if (clean && p.mobile) await phoneComposite(clean, p, `${outDir}/${key}--phone.png`);
    delete result.rects;
    delete result.marks;
    if (end) {
      delete end.rects;
      delete end.marks;
    }
    report[pName][vName] = { url, env, errors: errors.slice(0, 6), ...result, end };
    await context.close();
    process.stderr.write(
      `${key}: overlaps=${result.overlaps.length} small=${result.small.length} covered=${result.covered.length}\n`,
    );
  }
}

await browser.close();
await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
if (proofDir) {
  for (const f of ["safari-390--aries--phone.png"]) {
    const s = await stat(`${outDir}/${f}`).catch(() => null);
    if (s) process.stderr.write(`${f}: ${s.size} bytes\n`);
  }
}
console.log(`${outDir}/report.json`);
