import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  migrateLocalAsk,
  notesKey,
  threadKey,
  type FieldNote,
  type ThreadTurn,
} from "./field-notes.ts";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length() {
    return this.map.size;
  }

  clear() {
    this.map.clear();
  }

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.map.delete(key);
  }

  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

function seedThread(storage: Storage, id: string, thread: ThreadTurn[]) {
  storage.setItem(threadKey(id), JSON.stringify(thread));
}

function seedNotes(storage: Storage, id: string, notes: FieldNote[]) {
  storage.setItem(notesKey(id), JSON.stringify(notes));
}

describe("field-notes migrateLocalAsk", () => {
  it("exports stable localStorage key prefixes", () => {
    assert.equal(threadKey("visitor"), "vault-ask-thread-v1-visitor");
    assert.equal(notesKey("visitor"), "vault-field-notes-v1-visitor");
  });

  it("no-ops on empty or identical keys", () => {
    const storage = new MemoryStorage();
    seedThread(storage, "visitor", [{ role: "user", text: "hi" }]);
    migrateLocalAsk("", "uuid", storage);
    migrateLocalAsk("visitor", "visitor", storage);
    assert.ok(storage.getItem(threadKey("visitor")));
    assert.equal(storage.getItem(threadKey("uuid")), null);
  });

  it("moves thread and notes to destination and clears source", () => {
    const storage = new MemoryStorage();
    const from = "visitor";
    const to = "11111111-1111-1111-1111-111111111111";
    const thread: ThreadTurn[] = [{ role: "user", text: "hello" }];
    const notes: FieldNote[] = [{ id: "1", text: "note", at: 1 }];
    seedThread(storage, from, thread);
    seedNotes(storage, from, notes);

    migrateLocalAsk(from, to, storage);

    assert.equal(storage.getItem(threadKey(from)), null);
    assert.equal(storage.getItem(notesKey(from)), null);
    assert.deepEqual(JSON.parse(storage.getItem(threadKey(to))!), thread);
    assert.deepEqual(JSON.parse(storage.getItem(notesKey(to))!), notes);
  });

  it("does not overwrite existing destination data", () => {
    const storage = new MemoryStorage();
    const from = "visitor";
    const to = "22222222-2222-2222-2222-222222222222";
    seedThread(storage, from, [{ role: "user", text: "guest" }]);
    seedNotes(storage, from, [{ id: "g", text: "guest note", at: 1 }]);
    seedThread(storage, to, [{ role: "vault", text: "saved" }]);
    seedNotes(storage, to, [{ id: "s", text: "saved note", at: 2 }]);

    migrateLocalAsk(from, to, storage);

    assert.deepEqual(JSON.parse(storage.getItem(threadKey(to))!), [{ role: "vault", text: "saved" }]);
    assert.deepEqual(JSON.parse(storage.getItem(notesKey(to))!), [{ id: "s", text: "saved note", at: 2 }]);
    assert.equal(storage.getItem(threadKey(from)), null);
    assert.equal(storage.getItem(notesKey(from)), null);
  });

  it("no-ops when source is empty", () => {
    const storage = new MemoryStorage();
    migrateLocalAsk("visitor", "33333333-3333-3333-3333-333333333333", storage);
    assert.equal(storage.getItem(threadKey("33333333-3333-3333-3333-333333333333")), null);
    assert.equal(storage.getItem(notesKey("33333333-3333-3333-3333-333333333333")), null);
  });
});
