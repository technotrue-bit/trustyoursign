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

function readStoredTone(): ViewerTone {
  try {
    const v = localStorage.getItem(KEY);
    return v === "vault" || v === "warm" ? v : "warm";
  } catch {
    return "warm";
  }
}

type ViewerToneState = {
  tone: ViewerTone;
  setTone: (tone: ViewerTone) => void;
};

export const useViewerTone = create<ViewerToneState>((set) => ({
  // Safe default: a first-time viewer is never surprised by horror copy.
  tone: readStoredTone(),
  setTone: (tone) => {
    try {
      localStorage.setItem(KEY, tone);
    } catch {
      /* private mode */
    }
    set({ tone });
  },
}));

/** Whether a star of this genre is held shut by the warm setting. */
export function genreSealedByTone(tone: ViewerTone, kind: string): boolean {
  return tone === "warm" && kind === "horror";
}
