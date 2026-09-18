#!/bin/sh
# Force Vercel to always run the build (never skip preview / "only production").
# Exit 1 = continue build; exit 0 = ignore. Overrides dashboard Ignored Build Step.
echo "[vercel] ignoreCommand: forcing build (exit 1)"
exit 1
