/** Vault journey phase on `/` — galaxy fly → birth dock → forge → chart modes. */
export type VaultPhase = "galaxy" | "dock" | "forge" | "entered";

export function chatFromPhase(phase: VaultPhase): boolean {
  return phase === "dock";
}

export function busyFromPhase(phase: VaultPhase, entered: boolean): boolean {
  return entered || phase === "dock" || phase === "forge";
}

export function phaseAfterOpenVisitor(): VaultPhase {
  return "entered";
}

export function phaseAfterOpenBirthChat(): VaultPhase {
  return "dock";
}

export function phaseAfterCloseBirthChat(): VaultPhase {
  return "galaxy";
}
