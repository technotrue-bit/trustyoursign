import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  readAskMachineRemote,
  writeAskMachineRemote,
  useAskMachinePref,
} from "./askMachinePref.ts";

/** Minimal localStorage stub for node:test (no jsdom). */
function installLocalStorage(): void {
  const map = new Map<string, string>();
  const store: Storage = {
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
  Object.defineProperty(globalThis, "localStorage", {
    value: store,
    configurable: true,
    writable: true,
  });
}

describe("ask machine pref", { concurrency: false }, () => {
  beforeEach(() => {
    installLocalStorage();
    useAskMachinePref.setState({ remoteEnabled: true });
  });

  it("defaults to remote on", () => {
    assert.equal(readAskMachineRemote(), true);
  });

  it("persists off and on", () => {
    writeAskMachineRemote(false);
    assert.equal(readAskMachineRemote(), false);
    writeAskMachineRemote(true);
    assert.equal(readAskMachineRemote(), true);
  });

  it("store mirrors writes", () => {
    useAskMachinePref.getState().setRemoteEnabled(false);
    assert.equal(useAskMachinePref.getState().remoteEnabled, false);
    assert.equal(readAskMachineRemote(), false);
    useAskMachinePref.getState().setRemoteEnabled(true);
    assert.equal(useAskMachinePref.getState().remoteEnabled, true);
  });
});
