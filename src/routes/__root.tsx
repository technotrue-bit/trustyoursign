import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "The Vault";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Saige · natal machine. A fire face, a vault heart, a surgical mind.",
      },
      { name: "theme-color", content: "#0c0b0a" },
      { name: "color-scheme", content: "dark" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
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
      style={{ background: "#0c0b0a", color: "#efe8dc", colorScheme: "dark" }}
    >
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body,#app,#root{background:#0c0b0a!important;color:#efe8dc;margin:0;min-height:100%;}",
          }}
        />
      </head>
      <body style={{ background: "#0c0b0a", color: "#efe8dc", margin: 0 }}>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
