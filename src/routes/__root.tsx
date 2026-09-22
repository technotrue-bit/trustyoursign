import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AndroidInstallCapture } from "@/components/AndroidInstallCapture";
import { StageLock } from "@/components/StageLock";
import { OwnerBind } from "@/components/OwnerBind";
import {
  PWA_ICON_PATHS,
  PWA_STATUS_BAR_STYLE,
  PWA_THEME_COLOR,
} from "../../scripts/grok-pwa-chrome.mjs";
import appCss from "../styles.css?url";

const APP_NAME = "Trust Your Sign";

export const Route = createRootRoute({
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
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: PWA_ICON_PATHS.appleTouch },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Outfit:wght@300;400;500;600&display=swap",
      },
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
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <PreviewHostBridge />
        <AndroidInstallCapture />
        <StageLock />
        <AuthProvider>
          <OwnerBind />
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
