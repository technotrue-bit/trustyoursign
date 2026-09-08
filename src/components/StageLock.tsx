import { useEffect } from "react";
import { resolveAppHeight } from "@/lib/stage-height";
import { shouldFreezeAppHeight } from "@/lib/ui/stageLockPolicy";

const PATH_FIELD_ROOT = ".birth-chat";

function isPathField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.matches("input, textarea, select")) return false;
  return Boolean(el.closest(PATH_FIELD_ROOT));
}

/** Pin the stage to the visual viewport so iOS / in-app browsers don't leave a dead band.
 *  While BirthChat path fields are focused, freeze --app-h so the keyboard does not shrink WebGL. */
export function StageLock() {
  useEffect(() => {
    const root = document.documentElement;
    let pathFieldFocused = false;
    let frozenHeight: number | null = null;

    const apply = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? window.innerWidth);
      const liveH = Math.round(vv?.height ?? window.innerHeight);
      const t = Math.round(vv?.offsetTop ?? 0);
      const freeze = shouldFreezeAppHeight({ pathFieldFocused });
      const resolved = resolveAppHeight({
        vvHeight: liveH,
        innerHeight: window.innerHeight,
        pathFieldFocused: freeze,
        frozenHeight,
      });
      frozenHeight = resolved.nextFrozen;
      const h = resolved.height;
      const a = h > 0 ? w / h : 1;
      const key = `${w}x${h}+${t}`;
      if (root.dataset.stage === key) return;
      root.dataset.stage = key;
      root.style.setProperty("--app-w", `${w}px`);
      root.style.setProperty("--app-h", `${h}px`);
      root.style.setProperty("--app-top", `${t}px`);
      root.style.setProperty("--app-aspect", String(Math.round(a * 1000) / 1000));
      window.dispatchEvent(new Event("resize"));
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isPathField(e.target)) return;
      if (!pathFieldFocused) {
        const vv = window.visualViewport;
        frozenHeight = Math.round(vv?.height ?? window.innerHeight);
      }
      pathFieldFocused = true;
      apply();
    };

    const onFocusOut = (e: FocusEvent) => {
      if (!isPathField(e.target)) return;
      queueMicrotask(() => {
        const active = document.activeElement;
        pathFieldFocused = isPathField(active);
        if (!pathFieldFocused) frozenHeight = null;
        apply();
      });
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);
  return null;
}
