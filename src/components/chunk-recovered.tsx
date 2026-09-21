import { useEffect, type ReactNode } from "react";
import { clearStaleChunkReload } from "@/lib/chunk-reload";

/**
 * Place inside the suspense boundary that renders a lazy sky chunk.
 * It commits only after that chunk loads, which is what makes another
 * one-reload safe later.
 */
export function ChunkRecovered({ children }: { children: ReactNode }) {
  useEffect(() => {
    clearStaleChunkReload();
  }, []);
  return children;
}
