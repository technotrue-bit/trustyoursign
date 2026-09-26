# First-load weight — 2026-09-26

Local **production preview** of this branch versus `b9261cf` (main, Closed Beta v0.39).
Not the live site. Same lab both times: Lighthouse 12, mobile, simulated throttling,
headless Chrome, software WebGL (`llvmpipe`). A phone on a real network will not
match these seconds; the byte counts are the part that travels.

Intro frames from before this edit:
[GalaxyIntro reference, 2026-09-26](../reviews/galaxy-intro-reference-2026-09-26/NOTES.md)
(on the QA branch / PR, captured before this change).

## What a cold visit downloaded

No taps for 12 seconds, viewport 390×844, iPhone user agent, storage cleared.
Resource Timing `transferSize`.

| | Before (`b9261cf`) | After |
|---|---:|---:|
| All resources | 3.44 MB | 2.19 MB |
| Sign + nebula media | 2.96 MB | 1.70 MB |
| Plate WebPs | all 12 | Aries, Taurus, Gemini only |
| Aries life clip | 1.13 MB, started ~2.5 s | 1.13 MB, started ~6.0 s |
| JS | 472 KB | 472 KB |

A 3.5 s slice of the same cold load (before the ask finishes) requests only
`aries.webp`, `taurus.webp`, `gemini.webp`, and the modest nebula wallpaper.
The life clip waits until the ask veil lifts. Tapping Scorpio on the belt then
fetches Scorpio and its neighbors, not the rest of the wheel.

The full-res PNGs in `public/signs/` (~4.6 MB on disk) were already unused.
Nothing in this path requests them, or `thin-gold-front.png`.

## Lighthouse mobile (simulated)

| | Before | After |
|---|---:|---:|
| Performance score | 0.34 | 0.39 |
| First Contentful Paint | 4.9 s | 5.0 s |
| Largest Contentful Paint | 6.4 s | 6.2 s |
| Time to Interactive | 12.3 s | 11.5 s |
| Total Blocking Time | 2,260 ms | 1,580 ms |
| Speed index | 6.3 s | 5.0 s |
| Cumulative layout shift | 0 | 0 |
| Total byte weight | 3,570 KiB | 1,206 KiB |

FCP moving 4.9 → 5.0 is run-to-run noise. Lighthouse’s total-byte figure is
lower than the 12 s Resource Timing total because the Aries clip starts late
and is not fully inside Lighthouse’s early window. The 12 s table above is the
one that includes that clip.

Unthrottled localhost LCP stayed about 8.3 s on the `h1`. That title is gated
on the intro clock, not on the plate downloads.

## What changed

`GalaxyIntro` had a timer on every station (`420 + index * 85` ms) that called
`loadSignArt` for all twelve signs. Near-neighbor preload was already there
(`preloadSignArtNear`, eager stations 0–2). The timer is gone. A belt jump
still warms the chosen sign and its neighbors.

The Aries / Leo / Aquarius life clip still plays once the camera is parked and
the intro is over (`dwellClipMayPlay` already refuses during the intro). The
file is no longer fetched during the opening ask, so it does not race first
paint. Priming still starts while the sky is gathering, which leaves time to
buffer before the clip is allowed to play. Marking the clip “done” just because
the element does not exist yet would have skipped the painting’s motion; this
does not do that.

## How to verify on a phone

Private window, Safari or Chrome, remote-inspect the network panel.

1. Cold load. Before you touch anything you should see three plate images
   (Aries, Taurus, Gemini) and the nebula wallpaper, not twelve plates.
2. The Aries video should not start during the black “The Universe Asks You…”
   card. It may start once that card lifts, if you stay on Aries.
3. Skip, then tap a far sign (Scorpio). That plate and its neighbors load then.
   The painting should show; it may arrive a beat later than before on a slow
   link.
4. Stay on Aries after the intro. The life clip should still play once the
   camera has settled. It should not be a frozen empty plate.
