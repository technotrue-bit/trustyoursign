export type FieldNote = { id: string; text: string; at: number };
export type ThreadTurn = { role: "user" | "vault"; text: string };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadNotes(chartId: string): FieldNote[] {
  const rows = readJson<FieldNote[]>(`vault-field-notes-v1-${chartId}`, []);
  return Array.isArray(rows) ? rows.filter((n) => n && typeof n.text === "string") : [];
}

export function saveNotes(chartId: string, notes: FieldNote[]) {
  localStorage.setItem(`vault-field-notes-v1-${chartId}`, JSON.stringify(notes.slice(-20)));
}

export function loadThread(chartId: string): ThreadTurn[] {
  const rows = readJson<ThreadTurn[]>(`vault-ask-thread-v1-${chartId}`, []);
  return Array.isArray(rows) ? rows.filter((t) => t && typeof t.text === "string") : [];
}

export function saveThread(chartId: string, thread: ThreadTurn[]) {
  localStorage.setItem(`vault-ask-thread-v1-${chartId}`, JSON.stringify(thread.slice(-24)));
}
