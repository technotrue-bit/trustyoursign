import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { formatDegree } from "@/lib/chart/geometry";
import { useNativity } from "@/lib/chart/nativity";
import { formatBirth, formatClock } from "@/lib/chart/sun";
import { TEMPLE_SIGNS } from "@/lib/galaxy/temple";
import { signAtLon } from "@/lib/chart/signs";
import type {
  ChakraId,
  GateId,
  PlanetId,
  ReadingId,
} from "@/lib/chart/types";
import {
  useSession,
  useSessionMode,
  useSessionSelection,
} from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getSkyPass, persistNatal, saveChartTone, sitWithTheSky } from "@/lib/chart/sky";
import { Gloss, GlossRoot } from "./Gloss";
import { ChartSheet } from "./ChartSheet";
import { cn } from "@/lib/utils";

export function DetailPanel() {
  const session = useSession();
  const mode = useSessionMode();
  const selection = useSessionSelection();
  const shelf = session?.kind === "shelf" ? session : null;
  const clear = useSessionStore((s) => s.clear);
  const nat = useNativity();

  if (mode === "ask") return null;
  if (shelf) return <ShelfPanel />;
  if (!nat) return null;
  if (mode === "bones") return <BonesPanel />;
  if (mode === "readings" && !selection) return <ReadingsIndex />;
  if (mode === "machine" && !selection) return <MachineIndex />;
  if (mode === "gates" && !selection) return <GatesIndex />;
  if (mode === "body" && !selection) return <BodyIndex />;
  if (mode === "sky" && !selection) return <SkyIndex />;
  if (!selection) return null;

  return (
    <ChartSheet label="the page">
      <button
        type="button"
        onClick={clear}
        className="float-right -mt-1 flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:text-fg"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
      <div className="panel-enter pr-6">
        <GlossRoot>
          {selection.kind === "planet" ? <PlanetBody id={selection.id as PlanetId} /> : null}
          {selection.kind === "sign" ? <SignBody id={selection.id} /> : null}
          {selection.kind === "chakra" ? <ChakraBody id={selection.id as ChakraId} /> : null}
          {selection.kind === "gate" ? <GateBody id={selection.id as GateId} /> : null}
          {selection.kind === "step" ? <StepBody n={Number(selection.id)} /> : null}
          {selection.kind === "reading" ? <ReadingBody id={selection.id as ReadingId} /> : null}
          {selection.kind === "aspect" ? null : null}
        </GlossRoot>
      </div>
    </ChartSheet>
  );
}

function ShelfPanel() {
  const session = useSession();
  const shelf = session?.kind === "shelf" ? session : null;
  const setTone = useSessionStore((s) => s.setShelfTone);
  const setNatal = useSessionStore((s) => s.setShelfNatal);
  const user = useCurrentUser();
  const [deepLeft, setDeepLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!user) {
      setDeepLeft(null);
      return;
    }
    getSkyPass()
      .then((p) => setDeepLeft(p.remainingDeep))
      .catch(() => setDeepLeft(null));
  }, [user]);
  if (!shelf) return null;
  const sign = TEMPLE_SIGNS.find((s) => s.id === shelf.signId);
  const natal = shelf.skyNatal;
  return (
    <ChartSheet label="the shelf">
      <div className="panel-enter">
        <Kicker>{natal ? "The Big Three" : "Sun-sign shelf"}</Kicker>
        <Title>{shelf.label}</Title>
        <p className="mt-2 text-sm text-fg-muted">
          {formatBirth(shelf.birth.month, shelf.birth.day, shelf.birth.year)}
          {shelf.birth.hour != null && shelf.birth.minute != null ? ` · ${formatClock(shelf.birth.hour, shelf.birth.minute)}` : ""}
          {shelf.birth.place ? ` · ${shelf.birth.place}` : ""} · {sign?.name ?? shelf.signId}
        </p>
        {natal ? (
          <ul className="mt-3 space-y-1 text-sm text-fg">
            {natal.bodies.map((b) => (
              <li key={b.id}>
                {b.name} · {b.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-fg">
            {shelf.birth.place
              ? "The clock and the place are held. The Big Three wait on a reading of the sky."
              : `Yours is the sun in ${sign?.name ?? shelf.signId}. No time, no place, no planets.`}
          </p>
        )}
        <div className="mt-4 flex gap-2 text-xs tracking-[0.16em] uppercase">
          <button
            type="button"
            className={cn("min-h-11", shelf.tone === "vault" ? "text-fg" : "text-fg-subtle")}
            onClick={() => {
              setTone("vault");
              if (user && shelf.id) void saveChartTone({ data: { chartId: shelf.savedId ?? shelf.id, tone: "vault" } }).catch(() => {});
            }}
          >
            Vault
          </button>
          <button
            type="button"
            className={cn("min-h-11", shelf.tone === "warm" ? "text-fg" : "text-fg-subtle")}
            onClick={() => {
              setTone("warm");
              if (user && shelf.id) void saveChartTone({ data: { chartId: shelf.savedId ?? shelf.id, tone: "warm" } }).catch(() => {});
            }}
          >
            Warm
          </button>
        </div>
        <p className="mt-1 text-xs text-fg-subtle">How this chart speaks. The rest of the vault keeps its mouth.</p>
        {natal && user ? (
          <button
            type="button"
            disabled={busy || deepLeft === 0}
            className="mt-4 min-h-12 w-full rounded-md border border-border px-3 text-xs tracking-[0.18em] uppercase disabled:text-fg-subtle"
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                const r = await sitWithTheSky({ data: { natal } });
                setNatal(r.natal);
                setDeepLeft(0);
                if (shelf.id) void persistNatal({ data: { chartId: shelf.savedId ?? shelf.id, natal: r.natal } }).catch(() => {});
              } catch (e) {
                setErr(e instanceof Error ? e.message : "The deep cut is resting.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {deepLeft === 0 ? "Deep cut rests this week" : busy ? "Sitting with the sky…" : "Sit with the whole sky"}
          </button>
        ) : natal && !user ? (
          <p className="mt-3 text-xs text-fg-subtle">Sign in to ask the machine, and for one deep cut a week.</p>
        ) : null}
        {err ? <p role="alert" className="mt-2 text-sm text-wine">{err}</p> : null}
      </div>
    </ChartSheet>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-sans text-xs tracking-[0.18em] text-fg-muted uppercase">{children}</p>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-2xl leading-snug font-medium tracking-tight text-fg italic">
      {children}
    </h2>
  );
}

function PlanetBody({ id }: { id: PlanetId }) {
  const nat = useNativity();
  if (!nat) return null;
  const p = nat.planetById[id];
  if (!p) return null;
  const sign = signAtLon(p.lon);
  const wires = nat.aspects.filter((a) => a.a === id || a.b === id);
  return (
    <>
      <Kicker>
        <Gloss>{p.note}</Gloss>
      </Kicker>
      <Title>{p.headline}</Title>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        <Gloss>{p.why}</Gloss>
      </p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-fg">
        {p.body.map((para) => (
          <p key={para.slice(0, 24)}>
            <Gloss>{para}</Gloss>
          </p>
        ))}
      </div>
      <p className="mt-4 text-xs tracking-wide text-fg-subtle">
        <Gloss>
          {`${formatDegree(p.lon)} ${sign.name}${p.retrograde ? " · Rx" : ""} · house ${p.house}${p.dignity !== "peregrine" ? ` · ${p.dignity}` : ""}`}
        </Gloss>
      </p>
      {wires.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-border pt-4">
          {wires.map((w) => {
            const other = w.a === id ? w.b : w.a;
            return (
              <li key={w.id} className="text-xs leading-relaxed text-fg-muted">
                <span className="text-fg">{nat.planetById[other]?.name}</span>
                {" · "}
                <Gloss>{`${w.type} ${w.orb.toFixed(2)}° — ${w.text}`}</Gloss>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}

function SignBody({ id }: { id: string }) {
  const nat = useNativity();
  if (!nat) return null;
  const sign = nat.signs.find((s) => s.id === id);
  if (!sign) return null;
  const tenants = nat.planets.filter((p) => signAtLon(p.lon).id === sign.id);
  return (
    <>
      <Kicker>
        <Gloss>
          {`${sign.name}${sign.intercepted ? " · intercepted" : ""} · ${sign.element} · ${sign.modality}`}
        </Gloss>
      </Kicker>
      <Title>{sign.headline}</Title>
      <p className="mt-3 text-sm leading-relaxed text-fg">
        <Gloss>{sign.body}</Gloss>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        <Gloss>{sign.inChart}</Gloss>
      </p>
      {tenants.length > 0 ? (
        <ul className="mt-5 space-y-1 border-t border-border pt-4">
          {tenants.map((p) => (
            <li key={p.id} className="text-xs text-fg-muted">
              <span className="text-fg">{p.name}</span>
              {" · "}
              <Gloss>{`${formatDegree(p.lon)} · house ${p.house}`}</Gloss>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function ChakraBody({ id }: { id: ChakraId }) {
  const nat = useNativity();
  if (!nat) return null;
  const c = nat.chakraById[id];
  if (!c) return null;
  return (
    <>
      <Kicker>
        {c.sanskrit} · {c.rulers.map((r) => nat.planetById[r]?.name).join(" · ")}
      </Kicker>
      <Title>{c.headline}</Title>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg">
        {c.body.map((p) => (
          <p key={p.slice(0, 24)}>
            <Gloss>{p}</Gloss>
          </p>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-fg-muted">
        <Gloss>{c.practice}</Gloss>
      </p>
    </>
  );
}

function GateBody({ id }: { id: GateId }) {
  const nat = useNativity();
  if (!nat) return null;
  const g = nat.gateById[id];
  if (!g) return null;
  return (
    <>
      <Kicker>
        <Gloss>{g.kicker}</Gloss>
      </Kicker>
      <Title>{g.headline}</Title>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg">
        {g.body.map((p) => (
          <p key={p.slice(0, 24)}>
            <Gloss>{p}</Gloss>
          </p>
        ))}
      </div>
    </>
  );
}

function StepBody({ n }: { n: number }) {
  const nat = useNativity();
  if (!nat) return null;
  const step = nat.steps.find((s) => s.n === n);
  if (!step) return null;
  return (
    <>
      <Kicker>
        {nat.machineTitle} · {n} of {nat.steps.length}
      </Kicker>
      <Title>{step.title}</Title>
      <p className="mt-3 text-sm leading-relaxed text-fg">
        <Gloss>{step.body}</Gloss>
      </p>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        <Gloss>{nat.decisionClose}</Gloss>
      </p>
    </>
  );
}

function ReadingBody({ id }: { id: ReadingId }) {
  const nat = useNativity();
  if (!nat) return null;
  const r = nat.readingById[id];
  if (!r) return null;
  return (
    <>
      <Kicker>{r.name}</Kicker>
      <Title>{r.headline}</Title>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg">
        {r.body.map((p) => (
          <p key={p.slice(0, 24)}>
            <Gloss>{p}</Gloss>
          </p>
        ))}
      </div>
    </>
  );
}

function ListPanel({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <ChartSheet label={kicker}>
      <Kicker>{kicker}</Kicker>
      <Title>{title}</Title>
      <div className="mt-4">
        <GlossRoot>{children}</GlossRoot>
      </div>
    </ChartSheet>
  );
}

function SkyIndex() {
  const nat = useNativity();
  if (!nat) return null;
  const session = useSession();
  const select = useSessionStore((s) => s.select);
  const mains: PlanetId[] = [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "pluto",
    "asc",
    "mc",
  ];
  return (
    <ListPanel kicker="The sky" title={nat.meta.oneCut}>
      {session?.kind === "visitor" ? (
        <p className="mb-3 text-xs leading-relaxed text-fg-subtle">
          {nat.meta.zodiac} · {nat.meta.houses} · {nat.meta.zone} · {nat.meta.engine}. Entertainment, not advice.
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-1">
        {mains.map((id) => {
          const p = nat.planetById[id];
          if (!p) return null;
          const sign = signAtLon(p.lon);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => select({ kind: "planet", id })}
                className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left transition-colors duration-150 hover:bg-bg-subtle"
              >
                <span className="text-sm text-fg">{p.name}</span>
                <span className="hidden text-xs text-fg-subtle md:inline">
                  {formatDegree(p.lon)} {sign.abbr}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 hidden text-sm leading-relaxed text-fg-muted md:block">
        <Gloss>Drag the wheel. Click a sign on the ring, or a point in this list.</Gloss>
      </p>
    </ListPanel>
  );
}

function BodyIndex() {
  const nat = useNativity();
  if (!nat) return null;
  const select = useSessionStore((s) => s.select);
  return (
    <ListPanel kicker="The body" title="Seven centers. One chart.">
      <ul className="space-y-1">
        {nat.chakras.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => select({ kind: "chakra", id: c.id })}
              className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors duration-150 hover:bg-bg-subtle"
            >
              <span>{c.name}</span>
              <span className="text-xs tracking-wide text-fg-subtle uppercase">{c.sanskrit}</span>
            </button>
          </li>
        ))}
      </ul>
    </ListPanel>
  );
}

function GatesIndex() {
  const nat = useNativity();
  if (!nat) return null;
  const select = useSessionStore((s) => s.select);
  return (
    <ListPanel kicker="The three gates" title="What you are, in one cut.">
      <ul className="space-y-1">
        {nat.gates.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => select({ kind: "gate", id: g.id })}
              className="flex min-h-11 w-full flex-col items-start justify-center rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-bg-subtle"
            >
              <span className="text-sm text-fg">{g.name}</span>
              <span className="text-xs text-fg-muted">{g.kicker}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">{nat.meta.oneCut}</p>
    </ListPanel>
  );
}

function MachineIndex() {
  const nat = useNativity();
  if (!nat) return null;
  const select = useSessionStore((s) => s.select);
  return (
    <ListPanel kicker="The machine" title={nat.machineTitle}>
      <ul className="space-y-1">
        {nat.steps.map((s) => (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => select({ kind: "step", id: String(s.n) })}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm transition-colors duration-150 hover:bg-bg-subtle"
            >
              <span className="w-4 tabular-nums text-fg-subtle">{s.n}</span>
              <span>{s.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        <Gloss>{nat.decisionClose}</Gloss>
      </p>
    </ListPanel>
  );
}

function ReadingsIndex() {
  const nat = useNativity();
  if (!nat) return null;
  const select = useSessionStore((s) => s.select);
  return (
    <ListPanel kicker="Readings" title={nat.readingsTitle}>
      <ul className="space-y-1">
        {nat.readings.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => select({ kind: "reading", id: r.id })}
              className="flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm transition-colors duration-150 hover:bg-bg-subtle"
            >
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </ListPanel>
  );
}

function BonesPanel() {
  const nat = useNativity();
  if (!nat) return null;
  const session = useSession();
  return (
    <ChartSheet label="the bones" wide>
      <Kicker>The bones</Kicker>
      <Title>Treat the data tables as the bones.</Title>
      <p className="mt-2 max-w-2xl text-sm text-fg-muted">
        <GlossRoot>
          <Gloss>
            {`${nat.meta.name} · ${nat.meta.date} · ${nat.meta.time} · ${nat.meta.place} · ${nat.meta.zodiac} · ${nat.meta.houses}`}
          </Gloss>
        </GlossRoot>
      </p>
      {session?.kind === "visitor" ? (
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-fg-subtle">
          {nat.meta.engine} · timezone from birth place · degrees before meaning. This is not medical or legal advice.
        </p>
      ) : null}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs tracking-wide text-fg-subtle uppercase">
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-medium">Point</th>
              <th className="py-2 pr-3 font-medium">Position</th>
              <th className="py-2 pr-3 font-medium">House</th>
              <th className="py-2 pr-3 font-medium">WS</th>
              <th className="py-2 font-medium">Dignity</th>
            </tr>
          </thead>
          <tbody>
            {nat.planets.map((p) => {
              const sign = signAtLon(p.lon);
              return (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 text-fg">{p.name}</td>
                  <td className="py-2 pr-3 text-fg-muted">
                    {formatDegree(p.lon)} {sign.abbr}
                    {p.retrograde ? " Rx" : ""}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-fg-muted">{p.house}</td>
                  <td className="py-2 pr-3 tabular-nums text-fg-muted">{p.wholeSign}</td>
                  <td className="py-2 text-fg-muted">{p.dignity}</td>
                </tr>
              );
            })}
            {nat.extraBones.map((b) => (
              <tr key={b.name} className="border-b border-border/60">
                <td className="py-2 pr-3 text-fg">{b.name}</td>
                <td className="py-2 pr-3 text-fg-muted">{b.pos}</td>
                <td className="py-2 pr-3 text-fg-muted">{b.house}</td>
                <td className="py-2 pr-3 text-fg-muted">—</td>
                <td className="py-2 text-fg-muted">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs tracking-wide text-fg-subtle uppercase">House cusps</p>
          <ul className="mt-2 columns-2 text-sm text-fg-muted">
            {nat.houses.map((h) => (
              <li key={h.house} className="py-0.5">
                {h.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-wide text-fg-subtle uppercase">Shape</p>
          <p className="mt-2 text-sm text-fg-muted">
            Fire {nat.elements.fire} · Earth {nat.elements.earth} · Air {nat.elements.air} · Water{" "}
            {nat.elements.water}
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Cardinal {nat.modalities.cardinal} · Fixed {nat.modalities.fixed} · Mutable{" "}
            {nat.modalities.mutable}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{nat.meta.thesis}</p>
        </div>
      </div>
    </ChartSheet>
  );
}
