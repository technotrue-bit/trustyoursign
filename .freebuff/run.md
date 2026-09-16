# Trust Your Sign preview

## Reproduce the worktree artifacts

- Use the primary checkout at `C:\Users\Devin\Projects\trustyoursign` as the source for any uncommitted artifacts needed by this worktree.
- Copy any required local environment files from the primary checkout into this worktree; do not commit or document their secret values.
- Install dependencies with the repository's package manager using the existing lockfile before starting the app.
- Keep generated platform files and the `.freebuff` metadata local to this worktree.

## Run the server

- Start the development server with `npm run dev`.
- The `dev` script runs the app-env wrapper and binds Vite to `0.0.0.0:8080`.
- If port 8080 is occupied, choose a free port and update the dev command/preview registration for that session.
- Confirm the server answers before registering it in the Preview tab.
