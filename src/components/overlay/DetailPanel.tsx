import type { ReactNode } from "react";
import { X } from "lucide-react";
import { formatDegree } from "@/lib/chart/geometry";
import { useNativity } from "@/lib/chart/nativity";
import { signAtLon } from "@/lib/chart/signs";
import type {
  ChakraId,
  GateId,
  PlanetId,
  ReadingId,
} from "@/lib/chart/types";
import { useVault } from "@/lib/store";
import { Gloss, GlossRoot } from "./Gloss";
import { cn } from "@/lib/utils";

export function DetailPanel() {
  const mode = useVault((s) => s.mode);
  const selection = useVault((s) => s.selection);
  const clear = useVault((s) => s.clear);

  if (mode === "ask") return null;
  if (mode === "bones") return <BonesPanel />;
  if (mode === "readings" && !selection) return <ReadingsIndex />;
  if (mode === "machine" && !selection) return <MachineIndex />;
  if (mode === "gates" && !selection) return <GatesIndex />;
  if (mode === "body" && !selection) return <BodyIndex />;
  if (mode === "sky" && !selection) return <SkyIndex />;
  if (!selection) return null;

  return (
    <aside className={panelClass()}>
      <button
        type="button"
        onClick={clear}
        className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:text-fg"
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
    </aside>
  );
}

function panelClass() {
  return cn(
    "pointer-events-auto panel-enter absolute z-20 overflow-y-auto",
    "border border-border bg-bg-elevated/92 text-fg shadow-[var(--shadow-border)] backdrop-blur-sm",
    "max-md:right-3 max-md:bottom-24 max-md:left-3 max-md:max-h-[40vh] max-md:rounded-xl max-md:p-4",
    "md:top-36 md:right-5 md:bottom-24 md:w-80 md:rounded-xl md:p-6",
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
  const p = nat.planetById[id];
  if (!p) return null;
  const sign = signAtLon(p.lon);
  const wires = nat.aspects.filter((a) => a.a === id || a.b === id);
  return (
    <>
      <Kicker>{p.note}</Kicker>
      <Title>{p.headline}</Title>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">{p.why}</p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-fg">
        {p.body.map((para) => (
          <p key={para.slice(0, 24)}>{para}</p>
        ))}
      </div>
      <p className="mt-4 text-xs tracking-wide text-fg-subtle">
        {formatDegree(p.lon)} {sign.name}
        {p.retrograde ? " · Rx" : ""} · house {p.house}
        {p.dignity !== "peregrine" ? ` · ${p.dignity}` : ""}
      </p>
      {wires.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-border pt-4">
          {wires.map((w) => {
            const other = w.a === id ? w.b : w.a;
            return (
              <li key={w.id} className="text-xs leading-relaxed text-fg-muted">
                <span className="text-fg">{nat.planetById[other]?.name}</span>
                {" · "}
             
... 