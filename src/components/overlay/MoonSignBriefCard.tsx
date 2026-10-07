import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { enrichMoonSignBrief, getMoonSignBrief, type MoonSignBriefResult } from "@/lib/chart/moon-brief";
import type { SignId } from "@/lib/chart/types";
import { cn } from "@/lib/utils";

const cacheKey = (signId: SignId, dateKey: string) => `tys-moon-brief:${dateKey}:${signId}`;

function readCache(signId: SignId): MoonSignBriefResult | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(signId, "scan"));
    // Prefer keyed by date once we know it — scan all matching keys lightly.
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k?.startsWith(`tys-moon-brief:`) || !k.endsWith(`:${signId}`)) continue;
      const v = sessionStorage.getItem(k);
      if (!v) continue;
      return JSON.parse(v) as MoonSignBriefResult;
    }
    void raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(signId: SignId, result: MoonSignBriefResult) {
  try {
    sessionStorage.setItem(cacheKey(signId, result.moon.dateKey), JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

/** Compact “Today’s moon” strip for the in-sign galaxy HUD. */
export function MoonSignBriefCard({ signId, signName }: { signId: SignId; signName: string }) {
  const { user } = useCurrentUserState();
  const signedIn = Boolean(user);
  const [brief, setBrief] = useState<MoonSignBriefResult | null>(() => readCache(signId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = readCache(signId);
    if (cached) {
      setBrief(cached);
      return;
    }
    setBusy(true);
    setError(null);
    void getMoonSignBrief({ data: { signId } })
      .then((r) => {
        if (cancelled) return;
        setBrief(r);
        writeCache(signId, r);
      })
      .catch(() => {
        if (!cancelled) setError("The moon brief could not load.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signId]);

  const enrich = () => {
    if (busy || !signedIn) return;
    setBusy(true);
    setError(null);
    void enrichMoonSignBrief({ data: { signId } })
      .then((r) => {
        setBrief(r);
        writeCache(signId, r);
      })
      .catch(() => setError("The moon brief could not load."))
      .finally(() => setBusy(false));
  };

  if (error && !brief) {
    return (
      <div className="sign-galaxy-copy mx-auto mt-4 w-full max-w-md text-center">
        <p className="text-xs text-fg-subtle">{error}</p>
      </div>
    );
  }

  if (!brief && busy) {
    return (
      <div className="sign-galaxy-copy mx-auto mt-4 w-full max-w-md text-center" aria-busy="true">
        <p className="text-[0.65rem] tracking-[0.28em] text-fg-subtle uppercase">Today’s moon</p>
        <p className="mt-2 h-12 animate-pulse rounded-md bg-bg-subtle/40" />
      </div>
    );
  }

  if (!brief) return null;

  const lit = Math.round(brief.moon.illumination * 100);

  return (
    <div className="sign-galaxy-copy pointer-events-auto mx-auto mt-4 w-full max-w-md text-center">
      <p className="sign-galaxy-copy-kicker text-[0.65rem] tracking-[0.28em] uppercase">Today’s moon</p>
      <p className="mt-1 text-xs tracking-wide text-fg-muted">
        {brief.moon.phaseName} · Moon in {brief.moon.moonSignName} · {lit}% lit
      </p>
      <p className="sign-galaxy-copy-body mt-2 text-sm leading-relaxed md:text-[0.95rem]">
        {brief.effect}
      </p>
      <p className="mt-2 text-[0.6rem] tracking-[0.16em] text-fg-subtle uppercase">
        How it lands on {signName}
      </p>
      {signedIn ? (
        <button
          type="button"
          onClick={enrich}
          disabled={busy}
          className={cn(
            "mt-2 min-h-11 px-3 text-[0.65rem] tracking-[0.2em] text-fg-subtle uppercase hover:text-fg",
            "disabled:opacity-50",
          )}
        >
          {busy ? "Reading…" : brief.from === "machine" ? "Read again" : "Read"}
        </button>
      ) : null}
    </div>
  );
}
