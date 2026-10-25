import { track } from "@vercel/analytics";

export const GA_MEASUREMENT_ID = "G-KSC2J8LGVM";

export type AnalyticsParams = Record<string, string | number | boolean>;

type GtagFn = (
  command: "event" | "config" | "js",
  target: string | Date,
  params?: AnalyticsParams,
) => void;

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GtagFn;
};

/**
 * Fire a custom analytics event to both GA4 (gtag.js) and Vercel Web Analytics.
 * Properties must be flat strings, numbers, or booleans with no personal data
 * (no emails, birth dates/times/places, names, or free-text feedback).
 */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  const payload = params ?? {};
  const win = window as GtagWindow;
  if (typeof win.gtag === "function") {
    try {
      win.gtag("event", name, payload);
    } catch {
      /* ignore gtag errors */
    }
  }
  try {
    track(name, payload);
  } catch {
    /* ignore vercel analytics errors */
  }
}

export function trackChartCreated(sign: string, signedIn: boolean): void {
  trackEvent("chart_created", { sign, signed_in: signedIn });
}

export function trackSignViewed(
  sign: string,
  source: "corridor" | "direct" | "share",
): void {
  trackEvent("sign_viewed", { sign, source });
}

export function trackSignup(method: string, invite: boolean): void {
  trackEvent("signup", { method, invite });
}

export function trackChartSaved(sign: string): void {
  trackEvent("chart_saved", { sign });
}

export function trackShareClicked(
  sign: string,
  channel: "copy" | "x" | "native",
): void {
  trackEvent("share_clicked", { sign, channel });
}

const PENDING_SIGNUP_KEY = "tys.pending-signup-method.v1";

export function rememberPendingSignup(method: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_SIGNUP_KEY, method);
  } catch {
    /* ignore storage errors */
  }
}

export function consumePendingSignup(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const method = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (method) window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    return method;
  } catch {
    return null;
  }
}
