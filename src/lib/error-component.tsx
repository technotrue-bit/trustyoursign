import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ background: "#0c0b0a", color: "#efe8dc" }}
    >
      <span className="text-wine" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg font-medium italic">The sky hiccuped.</h1>
      <p className="max-w-md text-sm break-words text-fg-muted">
        {error.message || "Reload and try the chart again."}
      </p>
    </main>
  );
}
