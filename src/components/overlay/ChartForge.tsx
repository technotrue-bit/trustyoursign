import { useEffect, useState } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { getForgeAnonKey } from "@/lib/chart/forge-anon";
import {
  abandonForge,
  advanceForge,
  getForgeStatus,
} from "@/lib/chart/forge-api";
import type { ForgeJobView } from "@/lib/chart/forge";
import { useVault } from "@/lib/store";

const MIN_DWELL_MS = 5000;

function witLines(job: ForgeJobView | null): string[] {
  if (!job) return ["The sky is being cut."];
  const sign = CONSTELLATIONS.find((c) => c.id === job.signId);
  const lines = [
    `${sign?.name ?? "This sign"} holds the day you named.`,
    job.birth.place ? `The place was ${job.birth.place}.` : "A clock and a place still sharpen the cast.",
    sign ? `${sign.element}.` : "Element waits on the table.",
  ];
  if (job.sky?.bodies?.[0]) {
    lines.push(job.sky.bodies[0]!.note);
  }
  if (job.hasCast) lines.push("Degrees are tabled. Meaning is still arriving.");
  if (job.missing.length) lines.push(`Still forging: ${job.missing.join(", ")}.`);
  return lines;
}

export function ChartForge() {
  const jobId = useVault((s) => s.forgeJobId);
  const openVisitor = useVault((s) => s.openVisitor);
  const leaveForge = useVault((s) => s.leaveForge);
  const [job, setJob] = useState<ForgeJobView | null>(null);
  const [witIdx, setWitIdx] = useState(0);
  const [startedAt] = useState(() => performance.now());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let inFlight = false;
    const anonKey = getForgeAnonKey();

    const tick = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const next = await advanceForge({ data: { anonKey, jobId } });
        if (!cancelled) {
          setJob(next);
          setErr(next.error);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Forge stalled.");
      } finally {
        inFlight = false;
      }
    };

    void getForgeStatus({ data: { anonKey, jobId } })
      .then((j) => {
        if (!cancelled) setJob(j);
      })
      .catch(() => {});

    void tick();
    const poll = window.setInterval(() => void tick(), 1600);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [jobId]);

  useEffect(() => {
    if (!job || job.status !== "ready" || !job.nativity) return;
    const left = MIN_DWELL_MS - (performance.now() - startedAt);
    const t = window.setTimeout(
      () => {
        openVisitor(job.nativity!, job.sky);
      },
      Math.max(0, left),
    );
    return () => window.clearTimeout(t);
  }, [job, openVisitor, startedAt]);

  useEffect(() => {
    const lines = witLines(job);
    const id = window.setInterval(() => setWitIdx((i) => (i + 1) % Math.max(1, lines.length)), 2800);
    return () => window.clearInterval(id);
  }, [job]);

  const lines = witLines(job);
  const wit = lines[witIdx % lines.length] ?? lines[0]!;
  const canTablesOnly = Boolean(job?.hasCast && job.status === "partial");
  const canEnterReady = job?.status === "ready" && job.nativity && performance.now() - startedAt >= MIN_DWELL_MS;

  return (
    <div className="vault-overlay pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-bg/95 px-6">
      <div className="pointer-events-auto w-full max-w-lg text-center">
        <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">Making your chart</p>
        <h2 className="mt-3 font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.12] font-medium tracking-tight text-fg italic">
          The sky is being cut.
        </h2>
        <p className="mt-6 min-h-[3.5rem] text-sm leading-relaxed text-fg-muted md:text-base">{wit}</p>
        <p className="mt-4 text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
          {job?.hasCast ? (job.missing.length ? `Prose · ${job.missing[0]}` : "Ready") : "Casting the table"}
        </p>
        {err ? <p className="mt-3 text-sm text-wine">{err}</p> : null}
        <div className="mt-10 flex flex-col items-center gap-3">
          {canEnterReady ? (
            <button
              type="button"
              onClick={() => job?.nativity && openVisitor(job.nativity, job.sky)}
              className="min-h-12 w-full max-w-xs rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg"
            >
              Enter your chart
            </button>
          ) : null}
          {canTablesOnly ? (
            <button
              type="button"
              onClick={async () => {
                if (!jobId) return;
                const anonKey = getForgeAnonKey();
                const next = await advanceForge({ data: { anonKey, jobId, tablesOnly: true } });
                setJob(next);
                if (next.nativity) openVisitor(next.nativity, next.sky);
              }}
              className="min-h-11 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
            >
              Enter with tables only
            </button>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              if (!jobId) {
                leaveForge();
                return;
              }
              await abandonForge({ data: { anonKey: getForgeAnonKey(), jobId } });
              leaveForge();
            }}
            className="min-h-11 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          >
            Stop making this chart
          </button>
        </div>
      </div>
    </div>
  );
}

/** Resume helper for VaultApp mount — returns true if forge UI should show. */
export async function resumeForgeIfAny(
  enterForge: (id: string) => void,
  openVisitor: (n: NonNullable<ForgeJobView["nativity"]>, sky: ForgeJobView["sky"]) => void,
): Promise<boolean> {
  try {
    const { findActiveForge } = await import("@/lib/chart/forge-api");
    const job = await findActiveForge({ data: { anonKey: getForgeAnonKey() } });
    if (!job) return false;
    if (job.status === "ready" && job.nativity) {
      openVisitor(job.nativity, job.sky);
      return true;
    }
    if (job.status === "abandoned") return false;
    enterForge(job.id);
    return true;
  } catch {
    return false;
  }
}
