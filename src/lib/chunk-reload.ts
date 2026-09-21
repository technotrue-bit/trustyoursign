/**
 * A tab that loaded before a deploy keeps the old module graph. The next lazy
 * import asks for a hashed chunk the new build no longer serves, and the router
 * error screen stays up until a full reload fetches the new HTML.
 *
 * One reload per missing URL. The same URL failing again means the chunk is
 * actually absent, so we leave the error on screen instead of looping.
 */

const STALE_CHUNK =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

const STORAGE_KEY = "tys:stale-chunk";

export type ChunkReloadStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function staleChunkKey(error: unknown): string | null {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!STALE_CHUNK.test(message)) return null;
  return message.match(/https?:\/\/\S+/)?.[0] ?? message;
}

export function reloadOnceForStaleChunk(
  error: unknown,
  deps: {
    storage?: ChunkReloadStorage;
    reload?: () => void;
  } = {},
): boolean {
  const key = staleChunkKey(error);
  if (!key) return false;
  const storage = deps.storage ?? sessionStorage;
  const reload = deps.reload ?? (() => window.location.reload());
  try {
    if (storage.getItem(STORAGE_KEY) === key) return false;
    storage.setItem(STORAGE_KEY, key);
  } catch {
    return false;
  }
  reload();
  return true;
}

/** Call only after a sky chunk has committed, so a still-missing chunk cannot loop. */
export function clearStaleChunkReload(storage?: ChunkReloadStorage) {
  const target = storage ?? sessionStorage;
  try {
    target.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
