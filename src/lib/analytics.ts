import { track } from "@vercel/analytics";

export const GA_MEASUREMENT_ID = "G-KSC2J8LGVM";

/**
 * Inline head script for GA4. Consent mode starts denied, so GA sends
 * cookieless visit pings and the cookie notice stays true. gtag.js is fetched
 * after `load` and an idle slot, off the opening's main thread. Events fired
 * earlier queue in `dataLayer` and send once it arrives.
 */
export function gaBootstrapScript(id: string): string {
  const src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){window.dataLayer.push(arguments);}",
    "window.gtag=gtag;",
    "gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});",
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(id)});`,
    "(function(){var go=function(){var s=document.createElement('script');s.async=true;",
    `s.src=${JSON.stringify(src)};document.head.appendChild(s)};`,
    "var idle=function(){if(window.requestIdleCallback)window.requestIdleCallback(go,{timeout:4000});else setTimeout(go,1500)};",
    "if(document.readyState==='complete')idle();else window.addEventListener('load',idle,{once:true})})();",
  ].join("");
}

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
