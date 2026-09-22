/**
 * Capture Chrome's beforeinstallprompt for Android install UX.
 * The dedicated `?install=1` page handles the prompt UI; this module keeps a
 * deferred event available while the React app is open (no service worker).
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let listening = false;
const subscribers = new Set<(available: boolean) => void>();

function notify() {
  const available = deferred != null;
  for (const sub of subscribers) sub(available);
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
}

function onAppInstalled() {
  deferred = null;
  notify();
}

/** Start listening once (safe to call from a React effect). */
export function armAndroidInstallPromptCapture(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!listening) {
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    listening = true;
  }
  return () => {
    /* Keep the global listener for the session; React remounts should not drop BIP. */
  };
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPromptAvailability(
  listener: (available: boolean) => void,
): () => void {
  subscribers.add(listener);
  listener(deferred != null);
  return () => {
    subscribers.delete(listener);
  };
}

/** Fire the deferred Chrome install prompt when one was captured. */
export async function promptAndroidInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  return choice.outcome;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as { standalone?: boolean }).standalone)
  );
}
