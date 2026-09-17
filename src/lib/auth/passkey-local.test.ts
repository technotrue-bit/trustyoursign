import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  hasUsableLocalPasskeyEvidence,
  markLocalPasskeyAutofillOk,
  readLocalPasskeyCredentialIds,
  rememberLocalPasskeyCredentialIds,
} from "./passkey-local.ts";

const CREDENTIAL_IDS_KEY = "tys.passkey.credentialIds";
const AUTOFILL_OK_KEY = "tys.passkey.autofillOk";

/** Minimal localStorage stub for node:test (no jsdom). */
function installLocalStorage(): Storage {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });
  return storage;
}

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
});

describe("passkey-local evidence", () => {
  it("starts with no usable evidence", () => {
    installLocalStorage();
    assert.equal(hasUsableLocalPasskeyEvidence(), false);
    assert.deepEqual(readLocalPasskeyCredentialIds(), []);
  });

  it("remembers credential IDs and treats them as evidence", () => {
    const storage = installLocalStorage();
    rememberLocalPasskeyCredentialIds(["cred-a", "cred-b"]);
    rememberLocalPasskeyCredentialIds("cred-a");
    assert.deepEqual(readLocalPasskeyCredentialIds(), ["cred-a", "cred-b"]);
    assert.equal(hasUsableLocalPasskeyEvidence(), true);
    const stored = JSON.parse(storage.getItem(CREDENTIAL_IDS_KEY) ?? "[]");
    assert.deepEqual(stored, ["cred-a", "cred-b"]);
  });

  it("treats prior conditional autofill success as evidence", () => {
    const storage = installLocalStorage();
    markLocalPasskeyAutofillOk();
    assert.equal(storage.getItem(AUTOFILL_OK_KEY), "1");
    assert.equal(hasUsableLocalPasskeyEvidence(), true);
  });
});
