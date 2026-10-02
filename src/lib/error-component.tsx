import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { reloadOnceForStaleChunk } from "@/lib/chunk-reload";

function skyErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message) return message;
  }
  return "Reload and try the chart again.";
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  useEffect(() => {
    reloadOnceForStaleChunk(error);
  }, [error]);

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
        {skyErrorMessage(error)}
      </p>
    </main>
  );
}
