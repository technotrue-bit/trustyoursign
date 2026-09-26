import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Focus first control on open, trap Tab inside the dialog, restore focus on close.
 * Pass `active` false when the surface is unmounted or closed.
 */
export function useDialogFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  const prior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    prior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const id = window.requestAnimationFrame(() => {
      const list = focusables(node);
      const preferred = node.querySelector<HTMLElement>("[data-initial-focus]:not([disabled])");
      const start =
        preferred && !preferred.hasAttribute("disabled") && list.includes(preferred)
          ? preferred
          : list[0];
      (start ?? node).focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = focusables(node);
      if (list.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const here = document.activeElement;
      if (e.shiftKey && here === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && here === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(id);
      node.removeEventListener("keydown", onKey);
      const back = prior.current;
      if (back && document.contains(back)) {
        back.focus();
      }
      prior.current = null;
    };
  }, [active]);

  return ref;
}
