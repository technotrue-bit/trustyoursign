import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Share } from "lucide-react";
import { ShareCardDialog } from "@/components/ShareCardDialog";
import { trackEvent } from "@/lib/analytics";
import { dailySky, type DailySky } from "@/lib/chart/daily-sky";
import { SIGN_CANON, isSignId } from "@/lib/chart/sign-canon";
import type { SignId } from "@/lib/chart/types";
import { CALENDAR_SIGN_ORDER } from "@/lib/galaxy/constellations";
import { pageHead } from "@/lib/seo";
import { dailySkyCard, shareCardFileName } from "@/lib/share-card";
import { cn } from "@/lib/utils";

const SIGN_KEY = "tys.today-sign.v1";

export const Route = createFileRoute("/today")({
  validateSearch: (search: Record<string, unknown>): { sign?: SignId } =>
    typeof search.sign === "string" && isSignId(search.sign) ? { sign: search.sign } : {},
  head: () => pageHead("/today"),
  component: Today,
});

function rememberedSign(): SignId | null {
  try {
    const v = localStorage.getItem(SIGN_KEY);
    return v && isSignId(v) ? v : null;
  } catch {
    return null;
  }
}

function remember(signId: SignId) {
  try {
    localStorage.setItem(SIGN_KEY, signId);
  } catch {
    /* private mode: the address still carries the sign */
  }
}

function dateLabel(when = new Date()) {
  return when.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function whenLabel(at: Date) {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (at.toDateString() === today.toDateString()) return `today at ${time}`;
  if (at.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;
  return `${at.toLocaleDateString(undefined, { weekday: "long" })} at ${time}`;
}

function Today() {
  const { sign } = Route.useSearch();
  const navigate = useNavigate({ from: "/today" });
  const [signId, setSignId] = useState<SignId | null>(sign ?? null);
  const [day, setDay] = useState<DailySky | null>(null);
  const [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState(false);

  // The address wins; otherwise the sign picked here last time.
  useEffect(() => {
    if (sign) {
      setSignId(sign);
      remember(sign);
      return;
    }
    const kept = rememberedSign();
    if (kept) setSignId(kept);
  }, [sign]);

  useEffect(() => {
    if (!signId) return;
    let cancelled = false;
    setDay(null);
    setFailed(false);
    dailySky(signId)
      .then((d) => {
        if (cancelled) return;
        setDay(d);
        trackEvent("daily_sky_viewed", { sign: signId });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signId]);

  const choose = (id: SignId) => {
    remember(id);
    setSignId(id);
    void navigate({ search: { sign: id }, replace: true });
  };

  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <div className="mx-auto max-w-xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)]">
        <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Today’s sky</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight italic">
          {signId ? SIGN_CANON[signId].name : "Pick your sign"}
        </h1>
        <p className="mt-2 text-sm text-fg-muted" suppressHydrationWarning>
          {dateLabel()} · read from the real sky, new every day
        </p>

        <nav aria-label="Choose a sign" className="mt-6">
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {CALENDAR_SIGN_ORDER.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={signId === id}
                  onClick={() => choose(id)}
                  className={cn(
                    "min-h-11 w-full rounded-md border px-1 text-xs transition-colors",
                    signId === id
                      ? "border-fg text-fg"
                      : "border-border text-fg-muted hover:border-fg-subtle hover:text-fg",
                  )}
                >
                  {SIGN_CANON[id].name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {signId && !day && !failed ? (
          <div className="mt-8 space-y-3" aria-busy="true">
            <div className="h-6 w-2/3 animate-pulse rounded bg-bg-subtle" />
            <div className="h-24 animate-pulse rounded bg-bg-subtle" />
          </div>
        ) : null}

        {failed ? (
          <p role="alert" className="mt-8 text-sm text-wine">
            Today’s sky could not be read. Refresh to try again.
          </p>
        ) : null}

        {day ? <Reading day={day} onShare={() => setSharing(true)} /> : null}

        {!signId ? (
          <p className="mt-8 text-sm leading-relaxed text-fg-muted">
            Choose your sun sign. We’ll read where the Moon is today and how it lands on you, and
            remember your sign for next time.
          </p>
        ) : null}

        <p className="mt-10 text-xs leading-relaxed text-fg-subtle">
          Positions come from a real astronomy library for your local date. Readings are
          entertainment, not advice.{" "}
          <Link to="/how-this-works" className="underline hover:text-fg">
            How this works
          </Link>
        </p>
      </div>

      {day ? (
        <ShareCardDialog
          open={sharing}
          onClose={() => setSharing(false)}
          title={`${day.signName} today`}
          kind="today"
          signId={day.signId}
          layoutFor={(format) => dailySkyCard(day, format, dateLabel())}
          fileName={(format) => shareCardFileName("today", day.signId, format)}
          url={`https://trustyoursign.com/today?sign=${day.signId}`}
        />
      ) : null}
    </main>
  );
}

function Reading({ day, onShare }: { day: DailySky; onShare: () => void }) {
  const lit = Math.round(day.illumination * 100);
  return (
    <article className="panel-enter mt-8">
      <div className="flex items-center gap-4">
        <MoonDisc phaseAngle={day.phaseAngle} />
        <div className="min-w-0">
          <p className="text-sm text-fg">
            {day.phaseName} in {day.moonSignName}
          </p>
          <p className="text-xs text-fg-subtle">
            {lit}% lit · Sun in {day.sunSignName}
          </p>
        </div>
      </div>

      <h2 className="mt-6 font-display text-3xl leading-tight italic">{day.headline}</h2>
      <p className="mt-3 text-base leading-relaxed text-fg-muted">{day.body}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div>
          <dt className="text-[0.65rem] tracking-[0.24em] text-fg-subtle uppercase">Lean into</dt>
          <dd className="mt-1 font-display text-lg italic">{day.leanInto}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.24em] text-fg-subtle uppercase">Go easy on</dt>
          <dd className="mt-1 font-display text-lg italic">{day.goEasy}</dd>
        </div>
      </dl>

      <p className="mt-6 text-sm leading-relaxed text-fg-muted">{day.phaseLine}</p>
      {day.nextMoon ? (
        <p className="mt-2 text-sm leading-relaxed text-fg-muted" suppressHydrationWarning>
          The Moon moves into {day.nextMoon.signName} {whenLabel(day.nextMoon.at)}. Come back
          tomorrow for a new reading.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase hover:bg-fg"
        >
          <Share className="size-4" aria-hidden />
          Share today
        </button>
        <Link
          to="/"
          search={{ sign: day.signId }}
          className="min-h-12 content-center px-2 text-xs tracking-[0.18em] uppercase hover:text-accent"
        >
          Fly {day.signName}’s sky
        </Link>
      </div>
    </article>
  );
}

/** Small lit-fraction moon. Elongation 0 new, 180 full; lit on the right while waxing. */
function MoonDisc({ phaseAngle }: { phaseAngle: number }) {
  const r = 22;
  const a = ((phaseAngle % 360) + 360) % 360;
  const k = Math.cos((a * Math.PI) / 180);
  const waxing = a < 180;
  const rx = Math.abs(k) * r;
  // Outer half on the lit side, then the terminator back.
  const outer = waxing ? `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r}` : `M 0 ${r} A ${r} ${r} 0 0 1 0 ${-r}`;
  // A crescent's terminator bulges toward the lit side (sweep 0), a gibbous one away (sweep 1).
  const sweep = k > 0 ? 0 : 1;
  const term = waxing ? `A ${rx} ${r} 0 0 ${sweep} 0 ${-r}` : `A ${rx} ${r} 0 0 ${sweep} 0 ${r}`;
  return (
    <svg viewBox="-28 -28 56 56" className="size-14 shrink-0" aria-hidden>
      <circle r={r} fill="#2a2622" />
      <path d={`${outer} ${term} Z`} fill="#efe8dc" />
    </svg>
  );
}
