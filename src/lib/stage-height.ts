import { shouldFreezeAppHeight } from "./ui/stageLockPolicy.ts";

/** Last non-keyboard visual viewport height; used while path fields are focused. */
export function resolveAppHeight(args: {
  vvHeight: number;
  innerHeight: number;
  pathFieldFocused: boolean;
  frozenHeight: number | null;
}): { height: number; nextFrozen: number | null } {
  const live = Math.round(args.vvHeight > 0 ? args.vvHeight : args.innerHeight);
  if (!shouldFreezeAppHeight({ pathFieldFocused: args.pathFieldFocused })) {
    return { height: live, nextFrozen: live };
  }
  const frozen = args.frozenHeight != null && args.frozenHeight > 0 ? args.frozenHeight : live;
  return { height: frozen, nextFrozen: frozen };
}