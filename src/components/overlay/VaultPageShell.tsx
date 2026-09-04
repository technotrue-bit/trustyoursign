import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { VaultSkyBackdrop } from "./VaultSkyBackdrop";

type Props = {
  children: ReactNode;
  className?: string;
  /** Centered loading / deny layouts */
  center?: boolean;
  contentClassName?: string;
};

/**
 * Shared shell for flat vault routes — ambient sky behind translucent content.
 */
export function VaultPageShell({ children, className, center, contentClassName }: Props) {
  return (
    <main
      className={cn(
        "vault-page vault-page-shell text-fg",
        center && "grid place-items-center",
        className,
      )}
    >
      <VaultSkyBackdrop />
      <div className={cn("vault-page-content relative z-10 stagger-in", contentClassName)}>{children}</div>
    </main>
  );
}
