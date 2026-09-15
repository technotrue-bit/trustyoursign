### Task 4: Confirm HUD lower-third + strip field debug logs

**Files:**
- Modify: `src/components/overlay/SignGalaxyHud.tsx` (only if layout drifted)
- Modify: `src/styles.css` (only if wash missing)
- Modify: `src/components/scene/SignGalaxyField.tsx` (remove debug logs only)

**Interfaces:**
- Consumes: existing `sign-galaxy-lower` / `sign-galaxy-copy*` classes
- Produces: Landed HUD matches spec §3; no debug ingest left in field

- [ ] **Step 1: Verify HUD structure**

Confirm `SignGalaxyHud` landed chrome is:

1. Top row: Back + sign name (+ AuthSlot)
2. `flex-1` spacer
3. `sign-galaxy-lower` with `sign-galaxy-copy` (kicker / title / body) then dots + CTA

If anything recent reverted to centered mid-screen copy, restore the lower-third structure from the draft (spacer + `sign-galaxy-lower` + soft settle classes).

- [ ] **Step 2: Verify CSS wash**

Confirm `src/styles.css` still defines `.sign-galaxy-copy`, `::before` radial wash, and `.sign-galaxy-copy-kicker|title|body` text-shadows. If missing, restore:

```css
.sign-galaxy-copy {
  position: relative;
  isolation: isolate;
  padding: 0.85rem 1rem 1rem;
}
.sign-galaxy-copy::before {
  content: "";
  pointer-events: none;
  position: absolute;
  z-index: -1;
  inset: -0.5rem -1.25rem -0.75rem;
  border-radius: 1.25rem;
  background: radial-gradient(
    ellipse 78% 70% at 50% 55%,
    rgba(8, 7, 6, 0.72) 0%,
    rgba(8, 7, 6, 0.42) 48%,
    rgba(8, 7, 6, 0) 78%
  );
}
```

(Keep existing kicker/title/body shadow rules if already present.)

- [ ] **Step 3: Strip SignGalaxyField debug logs**

Remove the `#region agent log` / `fetch(...7819/ingest...)` block from `SignGalaxyField.tsx` `useFrame`. Do **not** change field visibility/opacity math (field stays the landed hero).

- [ ] **Step 4: Commit**

```bash
git add src/components/overlay/SignGalaxyHud.tsx src/styles.css src/components/scene/SignGalaxyField.tsx
git commit -m "fix(galaxy): lock land HUD lower-third and remove debug ingest"
```

(If HUD/CSS were already correct and only field logs changed, commit that file alone with the same message intent.)

---
