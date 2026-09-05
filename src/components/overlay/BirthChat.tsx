import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { TEMPLE_SIGNS } from "@/lib/galaxy/temple-data";
import { daysForSign, formatBirth, formatClock, isDateInSign, monthsForSign, sunSignOn } from "@/lib/chart/sun";
import { useVault } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { isSiteOwner } from "@/lib/owner";
import { getForgeAnonKey } from "@/lib/chart/forge-anon";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { Nativity } from "@/lib/chart/schema";
import { cn } from "@/lib/utils";

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

/** Hoisted once — avoid rebuilding ~100 years on every BirthChat mount. */
const BIRTH_YEARS: number[] = (() => {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = y; i >= 1926; i--) out.push(i);
  return out;
})();

/**
 * Dock shell only — first paint after claim. Form body mounts next frame so
 * claim → slide does not share one >50ms main-thread task with the date UI.
 */
export function BirthChat() {
  const picked = useVault((s) => s.pickedSign);
  const closeBirthChat = useVault((s) => s.closeBirthChat);
  const sign = CONSTELLATIONS.find((c) => c.id === picked) ?? CONSTELLATIONS[0]!;
  const temple = TEMPLE_SIGNS.find((c) => c.id === sign.id) ?? TEMPLE_SIGNS[0]!;
  const [bodyReady, setBodyReady] = useState(false);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setBodyReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <div className="vault-overlay pointer-events-none absolute inset-0 z-30 flex items-end justify-center md:items-stretch md:justify-end">
      <div
        className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/40 to-transparent md:bg-gradient-to-l md:from-bg/85 md:via-bg/35 md:to-transparent"
        aria-hidden
      />
      <div className="birth-chat pointer-events-auto relative max-h-[min(52dvh,28rem)] w-full overflow-y-auto px-5 pt-4 pb-[var(--chrome-bottom)] md:max-h-none md:w-[min(100%,24rem)] md:px-8 md:pt-[max(2.5rem,var(--chrome-top))] md:pb-10">
        <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
          <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">{temple.month}</p>
          <button
            type="button"
            onClick={closeBirthChat}
            className="min-h-11 shrink-0 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          >
            Back to sky
          </button>
        </div>
        <h2 className="font-display text-[2rem] leading-[1.08] font-medium tracking-tight text-fg italic md:text-4xl">
          {sign.name}.
        </h2>
        <p className="mt-2 text-[0.7rem] tracking-[0.2em] text-fg-subtle uppercase">
          {temple.element} · {temple.modality}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted md:text-base">{temple.essence}</p>
        <ul className="mt-4 max-w-sm space-y-2 text-sm leading-relaxed text-fg-muted">
          {temple.lines.slice(0, 2).map((line) => (
            <li key={line.slice(0, 24)}>{line}</li>
          ))}
          {temple.lines.slice(2, 4).map((line) => (
            <li key={line.slice(0, 24)} className="birth-chat-lines-extra">
              {line}
            </li>
          ))}
        </ul>
        {bodyReady ? <BirthChatBody signId={sign.id} /> : <div className="mt-8 h-40" aria-hidden />}
      </div>
    </div>
  );
}

function BirthChatBody({ signId }: { signId: string }) {
  const birth = useVault((s) => s.birth);
  const setBirth = useVault((s) => s.setBirth);
  const openLibrary = useVault((s) => s.openLibrary);
  const openShelf = useVault((s) => s.openShelf);
  const openVisitor = useVault((s) => s.openVisitor);
  const enterForge = useVault((s) => s.enterForge);
  const closeBirthChat = useVault((s) => s.closeBirthChat);
  const sign = CONSTELLATIONS.find((c) => c.id === signId) ?? CONSTELLATIONS[0]!;
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
  const [visitorBook, setVisitorBook] = useState<Nativity | null>(null);
  const [casting, setCasting] = useState(false);
  const [castErr, setCastErr] = useState<string | null>(null);
  const [yearMenuReady, setYearMenuReady] = useState(false);

  const monthN = Number(month);
  const yearN = Number(year);
  const signMonths = monthsForSign(sign.id);
  const signDays = daysForSign(sign.id, monthN, yearN || undefined);
  const dayN = Number(day);
  const ready = isDateInSign(sign.id, monthN, dayN) && signDays.includes(dayN) && yearN >= 1926;

  const sun = birth ? sunSignOn(birth.month, birth.day) : null;
  const sunName = sun ? CONSTELLATIONS.find((c) => c.id === sun)?.name : null;

  const pickMonth = (value: string) => {
    setMonth(value);
    const nextDays = daysForSign(sign.id, Number(value), yearN || undefined);
    if (day && !nextDays.includes(Number(day))) setDay("");
  };

  const pickYear = (value: string) => {
    setYear(value);
    const nextDays = daysForSign(sign.id, monthN, Number(value) || undefined);
    if (day && !nextDays.includes(Number(day))) setDay("");
  };

  const submit = () => {
    if (!ready) return;
    setBirth({ month: monthN, day: dayN, year: yearN, hour: null, minute: null, place: null });
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
    setBirth(next);
    setCasting(true);
    setCastErr(null);
    try {
      const { computeVisitorNatal } = await import("@/lib/chart/sky");
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
      setNatal(sky);
      setVisitorBook(nativity);
      setStep("rest");
    } catch (e) {
      setCastErr(e instanceof Error ? e.message : "The place could not be read.");
      setNatal(null);
      setVisitorBook(null);
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
          birthMonth: birth.month,
          birthDay: birth.day,
          birthYear: birth.year,
          birthHour: birth.hour,
          birthMinute: birth.minute,
          birthPlace: birth.place,
          natal,
          tone: natal?.tone ?? "vault",
          relation: "self" as const,
          personName: null,
          from: "galaxy" as const,
        }
      : null;

  if (!birth) {
    return (
      <form
        className="mt-8 space-y-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="font-display text-xl tracking-tight text-fg italic">When did you arrive?</p>
        <p className="text-sm leading-relaxed text-fg-subtle">Only the days the sun sat in {sign.name}.</p>
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
              {signMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS[m - 1]}
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
              {signDays.map((d) => (
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
              onFocus={() => setYearMenuReady(true)}
              className="path-field min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
              required
            >
              <option value="">—</option>
              {yearMenuReady
                ? BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))
                : year
                  ? (
                      <option value={year}>{year}</option>
                    )
                  : null}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={!ready}
          className={cn(
            "min-h-12 w-full rounded-md px-4 text-xs tracking-[0.22em] uppercase transition-colors duration-150 md:min-h-11",
            ready ? "bg-accent text-accent-fg hover:bg-fg" : "cursor-not-allowed bg-bg-subtle text-fg-subtle",
          )}
        >
          Continue
        </button>
        <button
          type="button"
          onClick={closeBirthChat}
          className="min-h-12 w-full text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg md:min-h-11"
        >
          Keep flying
        </button>
        <p className="max-w-sm text-xs leading-relaxed text-fg-subtle">{temple.chakraNote}</p>
      </form>
    );
  }

  if (step === "offer") {
    return (
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
    );
  }

  if (step === "deeper") {
    return (
      <form
        className="mt-8 space-y-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void submitDeeper();
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
          {casting ? "Reading the sky…" : "Hold this natal"}
        </button>
        <button
          type="button"
          onClick={() => setStep("rest")}
          className="min-h-12 w-full text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg md:min-h-11"
        >
          Skip — sun only
        </button>
      </form>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <p className="text-sm leading-relaxed text-fg-muted md:text-base">
        {formatBirth(birth.month, birth.day, birth.year)}
        {birth.hour != null && birth.minute != null ? ` · ${formatClock(birth.hour, birth.minute)}` : ""}
        {birth.place ? ` · ${birth.place}` : ""}.
      </p>
      <p className="font-display text-xl tracking-tight text-fg italic">
        {visitorBook
          ? "Your natal is tabled. Planets, houses, rising."
          : natal
            ? "The Big Three are tabled. Sun, Moon, Rising."
            : birth.place
              ? "The clock is held. Planets wait until the sky is calculated."
              : `The sun was in ${sunName}. You reached for what was already yours.`}
      </p>
      {castErr ? <p className="text-sm text-wine">{castErr}</p> : null}
      {natal ? (
        <ul className="space-y-1 text-sm text-fg-muted">
          {natal.bodies.map((b) => (
            <li key={b.id}>
              {b.name} · {b.note}
            </li>
          ))}
        </ul>
      ) : null}
      {visitorBook ? (
        <p className="text-xs leading-relaxed text-fg-subtle">
          Tropical · Whole Sign · {natal?.timeZone ?? "birth place timezone"} · astronomy-engine. Entertainment, not
          advice.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void (async () => {
            if (visitorBook && natal && birth) {
              try {
                const { startOrResumeForge } = await import("@/lib/chart/forge-api");
                const job = await startOrResumeForge({
                  data: {
                    anonKey: getForgeAnonKey(),
                    birth: {
                      signId: sign.id,
                      year: birth.year,
                      month: birth.month,
                      day: birth.day,
                      hour: birth.hour,
                      minute: birth.minute,
                      place: birth.place,
                      label: "Your natal",
                      tone: natal.tone ?? "vault",
                    },
                    sky: natal,
                    nativity: visitorBook,
                  },
                });
                enterForge(job.id);
                return;
              } catch {
                openVisitor(visitorBook, natal);
                return;
              }
            }
            const s = sketch();
            if (s) openShelf(s);
          })();
        }}
        className="min-h-12 w-full rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg md:min-h-11"
      >
        {visitorBook ? "Open this natal" : "Ask this sun"}
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
                const { saveChart } = await import("@/lib/charts");
                await saveChart({
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
          {saveErr ? <p className="text-sm text-wine">{saveErr}</p> : null}
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
  );
}
