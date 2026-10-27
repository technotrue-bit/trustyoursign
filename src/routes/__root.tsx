import { createRootRoute, HeadContent, Outlet, Scripts, redirect } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AndroidInstallCapture } from "@/components/AndroidInstallCapture";
import { StageLock } from "@/components/StageLock";
import { FrameMeter } from "@/components/FrameMeter";
import { OwnerBind } from "@/components/OwnerBind";
import { MaintenanceWatch } from "@/components/MaintenanceWatch";
import { getMaintenanceGate } from "@/lib/maintenance";
import { isMaintenanceExemptPath } from "@/lib/maintenance-paths";
import { GA_MEASUREMENT_ID, gaBootstrapScript } from "@/lib/analytics";
import { jsonLdText, siteJsonLd } from "@/lib/seo";
import {
  PWA_ICON_PATHS,
  PWA_STATUS_BAR_STYLE,
  PWA_THEME_COLOR,
} from "../../scripts/grok-pwa-chrome.mjs";
import appCss from "../styles.css?url";

const APP_NAME = "Trust Your Sign";
const GFONTS_LINK_ID = "gfonts-css";
// Paste the token from Search Console → URL-prefix property → HTML tag.
// Empty = no tag. Never invent a value; the DNS TXT route needs none.
const GOOGLE_SITE_VERIFICATION = "";
const SITE_JSON_LD = jsonLdText(siteJsonLd());

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (isMaintenanceExemptPath(location.pathname)) return;
    const gate = await getMaintenanceGate();
    if (gate.on && !gate.bypass) throw redirect({ to: "/maintenance" });
  },
  head: () => ({
    // Values come from scripts/grok-pwa-chrome.mjs (re-exported by grok-pwa-shared
    // for the Vite plugin / Nitro middleware). Omit legacy *-web-app-capable metas —
    // standalone comes from the manifest. Do not hard-code a second theme color.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Trust Your Sign · a natal fly-through. Pick a sign, fly its sky, unlock a chart.",
      },
      { name: "theme-color", content: PWA_THEME_COLOR },
      { name: "color-scheme", content: "dark" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: PWA_STATUS_BAR_STYLE },
      ...(GOOGLE_SITE_VERIFICATION
        ? [{ name: "google-site-verification", content: GOOGLE_SITE_VERIFICATION }]
        : []),
    ],
    // No canonical here: each public child route sets its own (src/lib/seo.ts).
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: PWA_ICON_PATHS.appleTouch },
      // Aries is the cold-boot sign for every fresh arrival (deep links to
      // another sign are the rare case) — starting this fetch from the raw
      // HTML wins a full round trip over waiting on the 3D scene's JS chunk
      // to load, check WebGL, and mount before it ever asks for the plate.
      { rel: "preload", as: "image", href: "/signs/aries.webp", fetchPriority: "high" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Loaded non-render-blocking (media=print, swapped to all by the inline
      // script below once it loads) — the stylesheet only carries @font-face
      // rules, and font-display: swap already means text paints in the
      // fallback font immediately either way, so this changes zero pixels
      // while removing ~800ms of first-paint block on a cold cache. A plain
      // `onload=".."` HTML attribute isn't reliable here: React treats it as
      // an (invalid, silently dropped) synthetic-event prop rather than a
      // literal attribute, so the swap runs from the script tag instead.
      {
        id: GFONTS_LINK_ID,
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Outfit:wght@300;400;500;600&display=swap",
        media: "print",
      },
    ],
    scripts: [
      // Data, not code: the CSP does not apply to application/ld+json.
      { type: "application/ld+json", children: SITE_JSON_LD },
      {
        children: `(function(){var l=document.getElementById(${JSON.stringify(GFONTS_LINK_ID)});if(!l)return;var go=function(){l.media="all"};if(l.sheet){go();return}l.addEventListener("load",go,{once:true})})();`,
      },
      { children: gaBootstrapScript(GA_MEASUREMENT_ID) },
    ],
  }),
  component: () => (
    <html
      lang="en"
      suppressHydrationWarning
      className="antialiased"
      style={{ background: PWA_THEME_COLOR, color: "#efe8dc", colorScheme: "dark" }}
    >
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body,#app,#root{background:${PWA_THEME_COLOR}!important;color:#efe8dc;margin:0;min-height:100%;}`,
          }}
        />
      </head>
      <body style={{ background: PWA_THEME_COLOR, color: "#efe8dc", margin: 0 }}>
        <a
          href="#main-content"
          className="skip-to-content"
          onClick={(e) => {
            const chrome = document.getElementById("sky-chrome");
            // While the dock is inert (opening veil, dive), land on main so the
            // next Tab reaches Skip. Once the dock is live, land on it.
            const dockLive = chrome != null && chrome.closest("[inert]") == null;
            const target = dockLive ? chrome : document.getElementById("main-content");
            if (!target) return;
            e.preventDefault();
            if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
            target.focus();
          }}
        >
          Skip to content
        </a>
        <PreviewHostBridge />
        <AndroidInstallCapture />
        <StageLock />
        <FrameMeter />
        <AuthProvider>
          <OwnerBind />
          <MaintenanceWatch />
          <Outlet />
        </AuthProvider>
        <Scripts />
        {/*
          Vercel Web Analytics (free Hobby pageviews/visitors). Production builds
          load the same-origin /_vercel/insights/script.js, which the existing
          CSP ('self') already allows. Dev would pull the debug script from
          va.vercel-scripts.com, which the CSP blocks, so it only mounts in
          production builds.
        */}
        {import.meta.env.PROD ? <Analytics /> : null}
      </body>
    </html>
  ),
});
