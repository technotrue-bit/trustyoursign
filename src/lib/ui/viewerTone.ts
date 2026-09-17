import { create } from "zustand";

/**
 * Viewer-level tone for how galaxy star copy speaks.
 *
 * The stars carry real genre registers — insight, spice, horror, warning — and
 * horror can be genuinely unsettling in public. "Warm" (the default) keeps
 * horror-register stars sealed behind an explicit opt-in; "Full" (vault voice)
 * opens everything. Reversible at any time, persisted per viewer.
 */

export type ViewerTone = "vault" | "warm";

const KEY = "vault.viewer-tone.v1";

export function parseViewerTone(value: string | null | undefined): ViewerTone {
  return value === "vault" || value === "warm" ? value : "warm";
}

function readStoredTone(): ViewerTone {
  try {
    return parseViewerTone(localStorage.getItem(KEY));
  } catch {
    return "warm";
  }
}

type ViewerToneState = {
  tone: ViewerTone;
  setTone: (tone: ViewerTone) => void;
  /** Re-read storage after mount (SSR / first paint may have missed it). */
  hydrateTone: () => void;
};

export const useViewerTone = create<ViewerToneState>((set) => ({
  // Safe default: a first-time viewer is never surprised by horror copy.
  tone: "warm",
  setTone: (tone) => {
    try {
      localStorage.setItem(KEY, tone);
    } catch {
      /* private mode */
    }
    set({ tone });
  },
  hydrateTone: () => {
    const tone = readStoredTone();
    set({ tone });
  },
}));

/** Whether a star of this genre is held shut by the warm setting. */
export function genreSealedByTone(tone: ViewerTone, kind: string): boolean {
  return tone === "warm" && kind === "horror";
}
