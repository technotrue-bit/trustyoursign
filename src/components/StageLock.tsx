import { useEffect } from "react";

/** Pin the stage to the visual viewport so iOS / in-app browsers don't leave a dead band. */
export function StageLock() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? window.innerWidth);
      const h = Math.round(vv?.height ?? window.innerHeight);
      const t = Math.round(vv?.offsetTop ?? 0);
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
    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
  return null;
}
