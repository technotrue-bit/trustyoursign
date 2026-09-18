import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearLocalPasskeyCredentialIds,
  hasLocalPasskeyCredentialIds,
  hasUsableLocalPasskeyEvidence,
  markLocalPasskeyAutofillOk,
  readLocalPasskeyCredentialIds,
  rememberLocalPasskeyCredentialIds,
} from "./passkey-local.ts";

const CREDENTIAL_IDS_KEY = "tys.passkey.credentialIds";
const AUTOFILL_OK_KEY = "tys.passkey.autofillOk";

type CookieJar = { value: string };

/** Minimal localStorage + document.cookie stub for node:test (no jsdom). */
function installBrowserStubs(): { storage: Storage; cookies: CookieJar } {
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
  const cookies: CookieJar = { value: "" };
  const document = {
    get cookie() {
      return cookies.value;
    },
    set cookie(next: string) {
      const [pair] = next.split(";");
      const eq = pair.indexOf("=");
      const name = eq >= 0 ? pair.slice(0, eq) : pair;
      const val = eq >= 0 ? pair.slice(eq + 1) : "";
      const parts = cookies.value ? cookies.value.split("; ").filter(Boolean) : [];
      const filtered = parts.filter((p) => !p.startsWith(`${name}=`));
      if (next.includes("Max-Age=0")) {
        cookies.value = filtered.join("; ");
        return;
      }
      filtered.push(`${name}=${val}`);
      cookies.value = filtered.join("; ");
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage, location: { protocol: "https:" } },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: document,
    configurable: true,
    writable: true,
  });
  return { storage, cookies };
}

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).document;
});

describe("passkey-local evidence", () => {
  it("starts with no usable evidence", () => {
    installBrowserStubs();
    assert.equal(hasUsableLocalPasskeyEvidence(), false);
    assert.equal(hasLocalPasskeyCredentialIds(), false);
    assert.deepEqual(readLocalPasskeyCredentialIds(), []);
  });

  it("remembers credential IDs in localStorage and cookie", () => {
    const { storage, cookies } = installBrowserStubs();
    rememberLocalPasskeyCredentialIds(["cred-a", "cred-b"]);
    rememberLocalPasskeyCredentialIds("cred-a");
    assert.deepEqual(readLocalPasskeyCredentialIds(), ["cred-a", "cred-b"]);
    assert.equal(hasUsableLocalPasskeyEvidence(), true);
    const stored = JSON.parse(storage.getItem(CREDENTIAL_IDS_KEY) ?? "[]");
    assert.deepEqual(stored, ["cred-a", "cred-b"]);
    assert.match(cookies.value, /tys\.passkey\.credentialIds=/);
  });

  it("heals localStorage from the cookie when Safari dropped storage", () => {
    const { storage } = installBrowserStubs();
    rememberLocalPasskeyCredentialIds(["cred-from-cookie"]);
    storage.removeItem(CREDENTIAL_IDS_KEY);
    assert.equal(storage.getItem(CREDENTIAL_IDS_KEY), null);
    assert.deepEqual(readLocalPasskeyCredentialIds(), ["cred-from-cookie"]);
    assert.equal(storage.getItem(CREDENTIAL_IDS_KEY), JSON.stringify(["cred-from-cookie"]));
  });

  it("heals cookie from localStorage when the cookie is missing", () => {
    const { cookies } = installBrowserStubs();
    rememberLocalPasskeyCredentialIds(["cred-from-storage"]);
    cookies.value = "";
    assert.deepEqual(readLocalPasskeyCredentialIds(), ["cred-from-storage"]);
    assert.match(cookies.value, /cred-from-storage/);
  });

  it("clears both stores", () => {
    const { storage, cookies } = installBrowserStubs();
    rememberLocalPasskeyCredentialIds("cred-x");
    clearLocalPasskeyCredentialIds();
    assert.deepEqual(readLocalPasskeyCredentialIds(), []);
    assert.equal(storage.getItem(CREDENTIAL_IDS_KEY), null);
    assert.equal(cookies.value.includes(`${CREDENTIAL_IDS_KEY}=`), false);
  });

  it("does not treat autofill-ok alone as modal evidence", () => {
    const { storage } = installBrowserStubs();
    markLocalPasskeyAutofillOk();
    assert.equal(storage.getItem(AUTOFILL_OK_KEY), "1");
    assert.equal(hasUsableLocalPasskeyEvidence(), false);
  });
});
