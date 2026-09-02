import { useMemo, useState } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { daysForSign, formatBirth, isDateInSign, monthsForSign, sunSignOn } from "@/lib/chart/sun";
import { useVault } from "@/lib/store";

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

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export function BirthChat() {
  const picked = useVault((s) => s.pickedSign);
  const birth = useVault((s) => s.birth);
  const setBirth = useVault((s) => s.setBirth);
  const openLibrary = useVault((s) => s.openLibrary);
  const closeBirthChat = useVault((s) => s.closeBirthChat);
  const sign = CONSTELLATIONS.find((c) => c.id === picked) ?? CONSTELLATIONS[0]!;

  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const out: number[] = [];
    for (let i = y; i >= 1926; i--) out.push(i);
    return out;
  }, []);

  const monthN = Number(month);
  const yearN = Number(year);
  const allowedMonths = monthsForSign(sign.id);
  const allowedDays = monthN ? daysForSign(sign.id, monthN, yearN || undefined) : [];
  const maxDay = monthN && yearN ? daysInMonth(monthN, yearN) : 31;
  const ready = monthN >= 1 && Number(day) >= 1 && yearN >= 1926;
  const valid = ready && isDateInSign(sign.id, monthN, Number(day));

  const sun = birth ? sunSignOn(birth.month, birth.day) : null;
  const sunName = sun ? CONSTELLATIONS.find((c) => c.id === sun)?.name : null;

  const submit = () => {
    if (!valid) return;
    setBirth({ month: monthN, day: Number(day), year: yearN });
  };

  return (
    <div className="vault-overlay pointer-events-none absolute inset-0 z-30 flex items-end justify-start md:items-center">
      <div className="absolute inset-0 bg-gradient-to-t from-bg from-25% via-bg/70 to-transparent md:bg-gradient-to-r md:from-bg md:from-20% md:via-bg/80 md:to-transparent" />
      <div className="birth-chat pointer-events-auto relative w-full max-w-md px-6 pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-12">
        <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">{sign.month}</p>
        <h2 className="mt-2 font-display text-4xl leading-[1.08] font-medium tracking-tight text-fg italic md:text-5xl">
          {sign.name}.
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted md:text-base">{sign.essence}</p>

        {!birth ? (
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <p className="font-display text-xl tracking-tight text-fg italic">When did you arrive?</p>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Month</span>
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setDay("");
                  }}
                  className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg"
                  required
                >
                  <option value="">—</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1} disabled={!allowedMonths.includes(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">Day</span>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg"
                  required
                >
                  <option value="">—</option>
                  {Array.from({ length: maxDay }, (_, i) => i + 1)
                    .filter((d) => !monthN || allowedDays.includes(d))
                    .map((d) => (
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
                  onChange={(e) => setYear(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg"
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
            <p className="text-xs tracking-wide text-fg-subtle">Only the days the sun sat in that sign.</p>
            <button
              type="submit"
              disabled={!valid}
              className="min-h-11 rounded-full border border-border bg-bg-elevated px-5 text-sm disabled:opacity-40"
            >
              Continue
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-fg-muted">
              {formatBirth(birth.month, birth.day, birth.year)}
              {sunName ? ` — the sun in ${sunName}.` : "."}
            </p>
            <button
              type="button"
              className="min-h-11 rounded-full border border-accent bg-bg-elevated px-5 text-sm"
              onClick={() => {
                closeBirthChat();
                openLibrary();
              }}
            >
              Enter the vault.
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
