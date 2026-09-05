import { SignShell } from "./SignShell";

type Props = {
  /** Target world height of the tallest axis after fit. */
  fitHeight?: number;
  /** @deprecated Auto-spin removed; use mesh review orbit controls. */
  autoSpin?: boolean;
};

/**
 * @deprecated Use `SignShell` with `signId="sagittarius"` instead.
 * Procedural volume shell — live OBJ path removed.
 */
export function SagittariusMesh({ fitHeight = 3.4 }: Props) {
  return <SignShell signId="sagittarius" fitHeight={fitHeight} />;
}
