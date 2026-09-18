/**
 * Viewer preference: whether Ask may call the remote natal machine (xAI).
 * When off, Ask still answers from local bones. Default on.
 */
import { create } from "zustand";

const KEY = "vault.ask-machine-remote.v1";

export function readAskMachineRemote(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return true;
    return raw !== "0";
  } catch {
    return true;
  }
}

export function writeAskMachineRemote(enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "0");
  } catch {
    /* private mode — in-memory store still holds for this tab */
  }
}

type AskMachinePrefState = {
  remoteEnabled: boolean;
  hydrate: () => void;
  setRemoteEnabled: (enabled: boolean) => void;
};

export const useAskMachinePref = create<AskMachinePrefState>((set) => ({
  remoteEnabled: true,
  hydrate: () => set({ remoteEnabled: readAskMachineRemote() }),
  setRemoteEnabled: (enabled) => {
    writeAskMachineRemote(enabled);
    set({ remoteEnabled: enabled });
  },
}));
