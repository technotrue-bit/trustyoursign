import { useEffect, useRef } from "react";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileToken?: string;
  }
}

/** Site key from Vite env at build time — undefined when unset/empty. */
export function turnstileSiteKey(): string | undefined {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : undefined;
}

function setTurnstileToken(token: string | undefined) {
  if (typeof window === "undefined") return;
  if (token) window.__turnstileToken = token;
  else delete window.__turnstileToken;
}

/** Headers login already sends as `x-captcha-response` when a token exists. */
export function turnstileCaptchaHeaders(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const token = window.__turnstileToken;
  return token ? { "x-captcha-response": token } : undefined;
}

/**
 * Renders Cloudflare Turnstile when `VITE_TURNSTILE_SITE_KEY` is set at build.
 * Writes the solved token to `window.__turnstileToken` for the login fetch path.
 */
export function TurnstileWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let scriptEl: HTMLScriptElement | null = null;

    const clearToken = () => setTurnstileToken(undefined);

    const mount = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": clearToken,
        "error-callback": clearToken,
        theme: "auto",
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (window.turnstile) {
      mount();
    } else if (existing) {
      scriptEl = existing;
      existing.addEventListener("load", mount);
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", mount);
      document.head.appendChild(script);
      scriptEl = script;
    }

    return () => {
      cancelled = true;
      clearToken();
      scriptEl?.removeEventListener("load", mount);
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div className="pt-1" aria-label="Bot protection">
      <div ref={containerRef} />
    </div>
  );
}
