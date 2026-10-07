import type { AccountRole } from "@/lib/auth/account-role";
import {
  CLOSED_BETA_TESTER_NAME,
  closedBetaTesterLines,
  isClosedBetaTester,
} from "@/lib/auth/closed-beta-badge";

function Seal() {
  return (
    <svg viewBox="0 0 12 12" className="closed-beta-badge__seal" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 .75 7.15 4.1 10.7 4.35 8.05 6.55 8.95 10.1 6 8.2 3.05 10.1 3.95 6.55 1.3 4.35 4.85 4.1Z"
      />
    </svg>
  );
}

function Chip({ className, decorative }: { className: string; decorative?: boolean }) {
  return (
    <span className={className} aria-hidden={decorative || undefined}>
      <Seal />
      {CLOSED_BETA_TESTER_NAME}
    </span>
  );
}

/**
 * Closed Beta Tester mark for a signed-in account whose role is `beta`.
 * A regular account renders nothing.
 *
 * `menu` — full line under the name in the account menu.
 * `hud` — the same line beside the avatar when the row has room, and a
 * stacked reading of the same words under the avatar on a phone.
 */
export function ClosedBetaTesterBadge({
  role,
  place,
}: {
  role: AccountRole | null | undefined;
  place: "menu" | "hud";
}) {
  if (!isClosedBetaTester(role)) return null;
  if (place === "menu") return <Chip className="closed-beta-badge closed-beta-badge--menu" />;
  return (
    <>
      <Chip className="closed-beta-badge closed-beta-badge--hud" decorative />
      <span className="closed-beta-stack" aria-hidden="true">
        {closedBetaTesterLines().map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </>
  );
}
