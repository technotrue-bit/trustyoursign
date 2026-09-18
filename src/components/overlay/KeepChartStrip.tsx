import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { upsertChart } from "@/lib/charts";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useSession, useSessionStore } from "@/lib/chart/session";
import { cn } from "@/lib/utils";

/** Quiet save for timed visitor natals opened before BirthChat rest. */
export function KeepChartStrip() {
  const user = useCurrentUser();
  const session = useSession();
  const attachSavedId = useSessionStore((s) => s.attachSavedId);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!session || session.kind !== "visitor" || session.savedId || saved) return null;
  if (!user) {
    return (
      <div
        className="pointer-events-auto absolute top-[calc(var(--chrome-top)+3.75rem)] right-3 left-3 z-40 max-w-sm md:right-auto md:left-5"
        data-no-fly
      >
        <p className="rounded-lg border border-border bg-bg-elevated/90 px-3 py-2 text-xs leading-relaxed text-fg-muted backdrop-blur-sm">
          <Link to="/login" className="text-fg underline">
            Sign in
          </Link>{" "}
          to keep this chart.
        </p>
      </div>
    );
  }

  const birth = session.birth;
  return (
    <div
      className="pointer-events-auto absolute top-[calc(var(--chrome-top)+3.75rem)] right-3 left-3 z-40 max-w-sm rounded-xl border border-border bg-bg-elevated/94 p-3 shadow-[var(--shadow-border)] backdrop-blur-sm md:right-auto md:left-5"
      data-no-fly
    >
      <label className="flex min-h-11 items-start gap-2 text-sm text-fg-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          Save this birth to my account
          {birth.place ? " (date, time, and place)" : " (date)"}.
        </span>
      </label>
      <button
        type="button"
        disabled={!consent || saving}
        className={cn(
          "mt-2 min-h-11 w-full rounded-md border border-border px-3 text-xs tracking-[0.18em] uppercase",
          "text-fg hover:bg-bg-subtle disabled:cursor-not-allowed disabled:text-fg-subtle",
        )}
        onClick={async () => {
          setSaving(true);
          setErr(null);
          try {
            const row = await upsertChart({
              data: {
                label: session.label || "My chart",
                relation: session.relation,
                signId: session.signId,
                birthMonth: birth.month,
                birthDay: birth.day,
                birthYear: birth.year,
                birthHour: birth.hour,
                birthMinute: birth.minute,
                birthPlace: birth.place,
                natal: session.skyNatal,
                tone: session.tone,
                consent: true,
              },
            });
            attachSavedId(row.id);
            setSaved(true);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not save");
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Saving…" : "Keep this chart"}
      </button>
      {err ? (
        <p role="alert" className="mt-2 text-xs text-wine">
          {err}
        </p>
      ) : null}
    </div>
  );
}
