export type FieldNote = { id: string; text: string; at: number };
export type ThreadTurn = { role: "user" | "vault"; text: string };

export function threadKey(id: string) {
  return `vault-ask-thread-v1-${id}`;
}

export function notesKey(id: string) {
  return `vault-field-notes-v1-${id}`;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readJson<T>(key: string, fallback: T, storage: StorageLike): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadNotesFrom(storage: StorageLike, chartId: string): FieldNote[] {
  const rows = readJson<FieldNote[]>(notesKey(chartId), [], storage);
  return Array.isArray(rows) ? rows.filter((n) => n && typeof n.text === "string") : [];
}

function loadThreadFrom(storage: StorageLike, chartId: string): ThreadTurn[] {
  const rows = readJson<ThreadTurn[]>(threadKey(chartId), [], storage);
  return Array.isArray(rows) ? rows.filter((t) => t && typeof t.text === "string") : [];
}

function saveNotesTo(storage: StorageLike, chartId: string, notes: FieldNote[]) {
  storage.setItem(notesKey(chartId), JSON.stringify(notes.slice(-20)));
}

function saveThreadTo(storage: StorageLike, chartId: string, thread: ThreadTurn[]) {
  storage.setItem(threadKey(chartId), JSON.stringify(thread.slice(-24)));
}

function defaultStorage(): StorageLike {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  return localStorage;
}

export function loadNotes(chartId: string): FieldNote[] {
  if (typeof window === "undefined") return [];
  return loadNotesFrom(localStorage, chartId);
}

export function saveNotes(chartId: string, notes: FieldNote[]) {
  localStorage.setItem(notesKey(chartId), JSON.stringify(notes.slice(-20)));
}

export function loadThread(chartId: string): ThreadTurn[] {
  if (typeof window === "undefined") return [];
  return loadThreadFrom(localStorage, chartId);
}

export function saveThread(chartId: string, thread: ThreadTurn[]) {
  localStorage.setItem(threadKey(chartId), JSON.stringify(thread.slice(-24)));
}

export function migrateLocalAsk(fromKey: string, toKey: string, storage: StorageLike = defaultStorage()): void {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const thread = loadThreadFrom(storage, fromKey);
  const notes = loadNotesFrom(storage, fromKey);
  if (!thread.length && !notes.length) return;
  const existingT = loadThreadFrom(storage, toKey);
  const existingN = loadNotesFrom(storage, toKey);
  if (existingT.length === 0 && thread.length) saveThreadTo(storage, toKey, thread);
  if (existingN.length === 0 && notes.length) saveNotesTo(storage, toKey, notes);
  storage.removeItem(threadKey(fromKey));
  storage.removeItem(notesKey(fromKey));
}
