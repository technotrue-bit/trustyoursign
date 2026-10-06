# Seams agents re-break

A failed sign-in check stays on "couldn't check." That person is not treated as signed out, and the check is not copied onto another page.

A sky picture is shared by itself. The address stays on the page. Putting the address on the same share sends only the link.

Flight helpers are not added so a screen can tweak a number. A saved chart keeps its writing when the planets refresh.

This page is the longer note for those four habits. The instruction not to add a second always-read file stays where it already is.

## For reviewers

| Seam | Say this | Lock |
|---|---|---|
| Session | One sign-in screen. A failed read is not signed out. Do not copy the check onto another page. | `RequireSession` in `src/lib/auth/gates.tsx`; states in `src/lib/auth/session-guard.ts`; routes in `require-session-routes.test.ts`; behavior in `session-guard.test.ts`. #182, #187. #101 is the storm that returns if log-out starts asking again. |
| Sky-code share | Picture share is the file alone. The link stays on the page. Do not put `url` on the file payload. | `planSkyShare` / `skySharePayload` in `src/lib/sky-code.ts`; assertions in `src/lib/sky-code.test.ts`. #175, #176, #177. |
| Travel exports | 86 export lines. Raise the number in review and name the caller. Do not delete helpers to match. Do not retune ENTER / dwell / portal here. | `src/lib/galaxy/travelExport.test.ts` (#186) after #183. R4 stays open. |
| Saved chart | Saved headline, why, and body stay when the fresh prose is empty. Positions update. | `mergeSavedSky` in `src/lib/chart/session/open-saved.ts`; `open-saved.test.ts`. #188. |
