# Research nativities (private)

`joey` and `saige` are owner-only research books. They used to live in
`src/lib/chart/nativities/*.ts`. This repo is public, so those files are
**no longer tracked**. Git history is unchanged — this did not rewrite it.

Joey should confirm this pull request before it merges. Until the private
seed is loaded, the owner desk's research library is empty and a chart
request answers `Research chart is not seeded`.

## Where they live now

| Piece | Path |
|---|---|
| Empty table | `migrations/0011_research_nativity.sql` (`research_nativity`) |
| Private JSON (gitignored) | `seeds/private/joey.json`, `seeds/private/saige.json` |
| Optional directory override | `RESEARCH_NATIVITY_SEED_DIR` |
| Load | `src/lib/chart/nativities/load.server.ts` (after the owner check) |
| Upsert | `node scripts/seed-research-nativities.mjs` |

`seeds/private/` is in `.gitignore`. Do not commit the JSON. Do not paste it
into chat, issues, or pull requests.

The table forces row-level security. The seed script sets `app.rls_bypass`
inside its transaction. Request handlers call the loader only after
`assertResearchOwner`, then read with that bypass so a recognised owner is
not blocked by the canonical-id GUC.

## Export from the last tracked copy

On a checkout that still has the TypeScript books (`origin/main`):

```bash
git worktree add /tmp/tys-charts origin/main
# Copy scripts/export-research-nativities.mjs from this branch into that worktree.
cd /tmp/tys-charts
npx tsx scripts/export-research-nativities.mjs
```

That writes `seeds/private/*.json` and prints only the filenames. Check
`git status` in any checkout you care about and confirm those files are
untracked-ignored.

Then, with `DATABASE_URL` set in the environment (not in a file you commit):

```bash
node scripts/seed-research-nativities.mjs
```

Apply migrations first so `research_nativity` exists. The script logs
`upserted joey` / `upserted saige` and nothing else.

If this branch no longer has `joey.ts`, `node scripts/export-research-nativities.mjs`
exits 2 and writes nothing. That is expected here.
