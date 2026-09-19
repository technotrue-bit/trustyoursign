import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useSheetFolded } from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { cn } from "@/lib/utils";

export function ChartSheet({
  children,
  label = "the page",
  wide = false,
  fill = false,
}: {
  children: ReactNode;
  label?: string;
  wide?: boolean;
  fill?: boolean;
}) {
  const folded = useSheetFolded();
  const foldSheet = useSessionStore((s) => s.foldSheet);
  return (
    <aside
      className={cn(
        "pointer-events-auto absolute z-20 flex flex-col overflow-hidden",
        "border border-border bg-bg-elevated/94 text-fg shadow-[var(--shadow-border)] backdrop-blur-sm",
        "chart-sheet",
        folded
          ? "chart-sheet--folded right-3 bottom-[calc(var(--dock-h)+var(--chrome-bottom)+0.35rem)] left-3 rounded-xl md:right-5 md:left-auto md:w-72"
          : wide
            ? "right-3 bottom-[calc(var(--dock-h)+var(--chrome-bottom)+0.35rem)] left-3 max-h-[min(50dvh,28rem)] rounded-xl md:top-16 md:right-5 md:bottom-24 md:left-5 md:max-h-none"
            : cn(
                "right-3 bottom-[calc(var(--dock-h)+var(--chrome-bottom)+0.35rem)] left-3 max-h-[min(42dvh,24rem)] rounded-xl",
                "md:top-36 md:right-5 md:bottom-24 md:left-auto md:w-80 md:max-h-none",
                fill && "h-[min(42dvh,24rem)] md:h-auto md:w-[22.5rem]",
              ),
      )}
    >
      <button
        type="button"
        aria-expanded={!folded}
        onClick={() => foldSheet(!folded)}
        className="flex min-h-11 w-full shrink-0 items-center justify-between gap-2 px-4 text-left"
      >
        <span className="text-[0.7rem] tracking-[0.2em] text-fg-subtle uppercase">
          {folded ? `Show ${label}` : "See the sky"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-fg-muted transition-transform duration-200 motion-reduce:transition-none",
            folded ? "-rotate-180" : "",
          )}
        />
      </button>
      <div
        className={cn(
          "chart-sheet__body min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-5",
          folded && "chart-sheet__body--folded",
        )}
        aria-hidden={folded}
        inert={folded || undefined}
      >
        {children}
      </div>
    </aside>
  );
}
