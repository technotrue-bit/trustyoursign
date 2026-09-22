import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { TEMPLE_SIGNS } from "@/lib/galaxy/temple";
import { formatBirth, formatClock, sunSignOn } from "@/lib/chart/sun";
import { fromVisitor, useClaim, useSessionStore } from "@/lib/chart/session";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { isSiteOwner } from "@/lib/owner";
import { upsertChart } from "@/lib/charts";
import { computeVisitorNatal } from "@/lib/chart/sky";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils";
import { Gloss, GlossRoot } from "./Gloss";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function BirthChat() {
  const claim = useClaim();
  const picked = claim?.signId;
  const birth = claim?.birth ?? null;
  const setClaimBirth = useSessionStore((s) => s.setClaimBirth);
  const openSession = useSessionStore((s) => s.openSession);
  const openShelf = useSessionStore((s) => s.openShelf);
  const openLibrary = useSessionStore((s) => s.openLibrary);
  const closeClaim = useSessionStore((s) => s.closeClaim);
  const sign = CONSTELLATIONS.find((c) => c.id === picked) ?? CONSTELLATIONS[0]!;
  const temple = TEMPLE_SIGNS.find((c) => c.id === sign.id) ?? TEMPLE_SIGNS[0]!;

  const user = useCurrentUser();
  const owner = isSiteOwner(user);
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [step, setStep] = useState<"offer" | "deeper" | "rest">("offer");
  const [hour12, setHour12] = useState("");
  const [minute, setMinute] = useState("");
  const [meridiem, setMeridiem] = useState<"am" | "pm">("am");
  const [place, setPlace] = useState("");
  const [natal, setNatal] = useState<SkyNatal | null>(null);
  const [casting, setCasting] = useState(false);
  const [castErr, setCastErr] = useState<string | null>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(true);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const out: number[] = [];
    for (let i = y; i >= 1926; i--) out.push(i);
    return out;
  }, []);

  const monthN = Number(month);
  const yearN = Number(year);
  const dayN = Number(day);
  const thisYear = new Date().getFullYear();
  const monthIsValid = monthN >= 1 && monthN <= 12;
  // Calendar length of the picked month, so Feb 30 never becomes an option.
  const monthLen = monthIsValid ? new Date(yearN || thisYear, monthN, 0).getDate() : 31;
  const monthDays = useMemo(() => Array.from({ length: monthLen }, (_, i) => i + 1), [monthLen]);
  const ready = monthN >= 1 && monthN <= 12 && dayN >= 1 && dayN <= 31 && yearN >= 1926;

  // Any real date is accepted; the sun it actually falls under is the authority.
  const enteredSun = ready ? sunSignOn(monthN, dayN) : null;
  const enteredSunName = enteredSun ? (CONSTELLATIONS.find((c) => c.id === enteredSun)?.name ?? null) : null;
  const offSign = Boolean(enteredSun && enteredSunName && enteredSun !== sign.id);

  const sun = birth ? sunSignOn(birth.month, birth.day) : null;
  const sunName = sun ? CONSTELLATIONS.find((c) => c.id === sun)?.name : null;

  const pickMonth = (value: string) => {
    setMonth(value);
    const m = Number(value);
    if (m < 1 || m > 12) {
      setDay("");
      return;
    }
    const nextDays = new Date(yearN || thisYear, m, 0).getDate();
    if (day && Number(day) > nextDays) setDay("");
  };

  const pickYear = (value: string) => {
    setYear(value);
    if (!monthIsValid) return;
    const nextDays = new Date(Number(value) || thisYear, monthN, 0).getDate();
    if (day && Number(day) > nextDays) setDay("");
  };

  const submit = () => {
    if (!ready) return;
    // Record the date as entered. Which sun it fell under is resolved from the
    // date itself, not from the sign this form was opened for.
    setClaimBirth({ month: monthN, day: dayN, year: yearN, hour: null, minute: null, place: null });
    setStep("offer");
  };

  const toHour24 = () => {
    const h = Number(hour12);
    if (h < 1 || h > 12) return null;
    if (h === 12) return meridiem === "am" ? 0 : 12;
    return meridiem === "pm" ? h + 12 : h;
  };

  const submitDeeper = async () => {
    if (!birth) return;
    const h = toHour24();
    const m = Number(minute);
    const loc = place.trim();
    if (h == null || m < 0 || m > 59 || loc.length < 2) return;
    const next = { ...birth, hour: h, minute: m, place: loc.slice(0, 120) };
    setClaimBirth(next);
    setCasting(true);
    setCastErr(null);
    try {
      const { sky, nativity } = await computeVisitorNatal({
        data: {
          year: next.year,
          month: next.month,
          day: next.day,
          hour: h,
          minute: m,
          place: loc,
          tone: "vault",
          label: "Your natal",
        },
      });
      openSession(
        fromVisitor({
          nativity,
          skyNatal: sky,
          birth: next,
          signId: sign.id,
          origin: "galaxy",
        }),
      );
    } catch (e) {
      setCastErr(e instanceof Error ? e.message : "The place could not be read.");
      setNatal(null);
      setStep("rest");
    } finally {
      setCasting(false);
    }
  };

  const sketch = () =>
    birth
      ? {
          label: "My chart",
          signId: sign.id,
          birth,
          skyNatal: natal,
          tone: natal?.tone ?? "vault",
          relation: "self" as const,
          personName: null,
          origin: "galaxy" as const,
        }
      : null;

  return (
    <div className="vault-overlay pointer-events-none absolute inset-0 z-30 flex items-end justify-start md:items-center">
      <div className="absolute inset-0 bg-gradient-to-t from-bg from-25% via-bg/70 to-transparent md:bg-gradient-to-r md:from-bg md:from-20% md:via-bg/80 md:to-transparent" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="birth-chat-title"
        tabIndex={-1}
        className="birth-chat pointer-events-auto relative w-full max-w-md px-5 pt-[var(--chrome-top)] pb-[var(--chrome-bottom)] outline-none md:px-12 md:pt-16"
      >
        <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">{temple.month}</p>
        <h2
          id="birth-chat-title"
          className="mt-2 font-display text-[2.15rem] leading-[1.08] font-medium tracking-tight text-fg italic md:text-5xl"
        >
          {sign.name}.
        </h2>
        <p className="mt-2 text-[0.7rem] tracking-[0.2em] text-fg-subtle uppercase">
          {temple.element} · {temple.modality}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted md:text-base">
          <GlossRoot>
            <Gloss>{temple.essence}</Gloss>
          </GlossRoot>
        </p>
        <ul className="mt-4 max-w-sm space-y-2 text-sm leading-relaxed text-fg-muted">
          {temple.lines.slice(0, 2).map((line) => (
            <li key={line.slice(0, 24)}>{line}</li>
          ))}
        </ul>

        {!birth ? (
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <p className="font-display text-xl tracking-tight text-fg italic">When did you arrive?</p>
            <p className="text-sm leading-relaxed text-fg-subtle">The day you arrived.</p>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Month</span>
                <select
                  value={month}
                  onChange={(e) => pickMonth(e.target.value)}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
                  required
                >
                  <option value="">—</option>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Day</span>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
                  required
                  disabled={!monthN}
                >
                  <option value="">—</option>
                  {monthDays.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Year</span>
                <select
                  value={year}
                  onChange={(e) => pickYear(e.target.value)}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
                  required
                >
                  <option value="">—</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {offSign ? (
              <p className="text-sm text-fg-muted mt-3">
                Born on a cusp? Your sun is in {enteredSunName}. We&apos;ll use that.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!ready}
              className={cn(
                "min-h-12 w-full rounded-md px-4 text-xs tracking-[0.22em] uppercase transition-colors duration-150 md:min-h-11",
                ready
                  ? "bg-accent text-accent-fg hover:bg-fg"
                  : "cursor-not-allowed bg-bg-subtle text-fg-subtle",
              )}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={closeClaim}
              className="min-h-12 w-full text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg md:min-h-11"
            >
              Keep flying
            </button>
            <p className="max-w-sm text-xs leading-relaxed text-fg-subtle">{temple.chakraNote}</p>
            <ul className="max-w-sm space-y-2 text-sm leading-relaxed text-fg-muted birth-chat-lines-extra">
              {temple.lines.slice(2, 4).map((line) => (
                <li key={line.slice(0, 24)}>{line}</li>
              ))}
            </ul>
          </form>
        ) : step === "offer" ? (
          <div className="mt-8 space-y-5">
            <p className="text-sm leading-relaxed text-fg-muted md:text-base">
              {formatBirth(birth.month, birth.day, birth.year)}.
            </p>
            <p className="font-display text-xl tracking-tight text-fg italic">
              The sun was in {sunName}. You reached for what was already yours.
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">
              Do you want to go deeper? The clock and the place make a natal. The sun is already enough to stay.
            </p>
            <button
              type="button"
              onClick={() => setStep("deeper")}
              className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg md:min-h-11"
            >
              Go deeper
            </button>
            <button
              type="button"
              onClick={() => setStep("rest")}
              className="min-h-12 w-full text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg md:min-h-11"
            >
              Not yet — keep the sun
            </button>
            <p className="max-w-sm text-xs leading-relaxed text-fg-subtle">{temple.chakraNote}</p>
          </div>
        ) : step === "deeper" ? (
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              submitDeeper();
            }}
          >
            <p className="font-display text-xl tracking-tight text-fg italic">The rest of the sky.</p>
            <p className="text-sm leading-relaxed text-fg-subtle">
              {formatBirth(birth.month, birth.day, birth.year)}. Time and place, as they were written.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Hour</span>
                <select
                  value={hour12}
                  onChange={(e) => setHour12(e.target.value)}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
                  required
                >
                  <option value="">—</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Minute</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
                  required
                >
                  <option value="">—</option>
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">AM / PM</span>
                <select
                  value={meridiem}
                  onChange={(e) => setMeridiem(e.target.value === "pm" ? "pm" : "am")}
                  className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
                >
                  <option value="am">AM</option>
                  <option value="pm">PM</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Place of birth</span>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="City, country"
                maxLength={120}
                className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                required
              />
            </label>
            <button
              type="submit"
              disabled={casting || toHour24() == null || minute === "" || place.trim().length < 2}
              className={cn(
                "min-h-12 w-full rounded-md px-4 text-xs tracking-[0.22em] uppercase md:min-h-11",
                !casting && toHour24() != null && minute !== "" && place.trim().length >= 2
                  ? "bg-accent text-accent-fg hover:bg-fg"
                  : "cursor-not-allowed bg-bg-subtle text-fg-subtle",
              )}
            >
              {casting ? <span aria-live="polite">Reading the sky…</span> : "Hold this natal"}
            </button>
            <button
              type="button"
              onClick={() => setStep("rest")}
              className="min-h-12 w-full text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg md:min-h-11"
            >
              Skip — sun only
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-5">
            <p className="text-sm leading-relaxed text-fg-muted md:text-base">
              {formatBirth(birth.month, birth.day, birth.year)}
              {birth.hour != null && birth.minute != null ? ` · ${formatClock(birth.hour, birth.minute)}` : ""}
              {birth.place ? ` · ${birth.place}` : ""}.
            </p>
            <p className="font-display text-xl tracking-tight text-fg italic">
              {natal
                ? "The Big Three are tabled. Sun, Moon, Rising."
                : birth.place
                  ? "The clock is held. Planets wait until the sky is calculated."
                  : `The sun was in ${sunName}. You reached for what was already yours.`}
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">
              Your sky is ready. Ask lives as a room inside once you open it.
            </p>
            {castErr ? <p role="alert" className="text-sm text-wine">{castErr}</p> : null}
            {natal ? (
              <ul className="space-y-1 text-sm text-fg-muted">
                {natal.bodies.map((b) => (
                  <li key={b.id}>
                    {b.name} · {b.note}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const s = sketch();
                if (s) openShelf(s);
              }}
              className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg md:min-h-11"
            >
              Open your sky
            </button>
            {owner ? (
              <button
                type="button"
                onClick={openLibrary}
                className="min-h-12 w-full text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg md:min-h-11"
              >
                Research desk
              </button>
            ) : null}
            {user ? (
              <div className="space-y-3">
                <label className="flex min-h-11 items-start gap-2 text-sm text-fg-muted">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                  <span>Save this birth to my account{birth.place ? " (date, time, and place)" : " (date)"}.</span>
                </label>
                <button
                  type="button"
                  disabled={!consent || saving || saved}
                  className={cn(
                    "min-h-12 w-full rounded-md border border-border px-4 text-xs tracking-[0.22em] uppercase md:min-h-11",
                    saved ? "text-fg-subtle" : "text-fg hover:bg-bg-elevated",
                  )}
                  onClick={async () => {
                    setSaving(true);
                    setSaveErr(null);
                    try {
                      const row = await upsertChart({
                        data: {
                          label: "My chart",
                          relation: "self",
                          signId: sign.id,
                          birthMonth: birth.month,
                          birthDay: birth.day,
                          birthYear: birth.year,
                          birthHour: birth.hour,
                          birthMinute: birth.minute,
                          birthPlace: birth.place,
                          natal,
                          tone: natal?.tone ?? "vault",
                          consent: true,
                        },
                      });
                      if (useSessionStore.getState().session) {
                        useSessionStore.getState().attachSavedId(row.id);
                      }
                      setSaved(true);
                    } catch (e) {
                      setSaveErr(e instanceof Error ? e.message : "Could not save");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saved ? "Saved to your vault" : "Keep this chart"}
                </button>
                {saveErr ? <p role="alert" className="text-sm text-wine">{saveErr}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-fg-muted">
                <Link to="/login" className="text-fg underline">
                  Sign in
                </Link>{" "}
                to keep this chart, and to save other people you have permission for.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
