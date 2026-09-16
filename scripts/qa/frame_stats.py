"""Frame statistics for the sign-enter dive — the "is it as rich as the
reference?" number, not a vibe.

    python scripts/qa/frame_stats.py <dir-or-images...>

Per image: mean luma, % pixels above a lit threshold (0.12) and bright (0.5),
plus the same inside the central 60% box (where the figure/core should live).
"""
import sys
from pathlib import Path

from PIL import Image


def stats(path: Path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    n = w * h
    total = 0.0
    lit = 0
    bright = 0
    cx0, cx1 = int(w * 0.2), int(w * 0.8)
    cy0, cy1 = int(h * 0.2), int(h * 0.8)
    c_total = 0.0
    c_lit = 0
    c_bright = 0
    c_n = 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
            total += l
            if l > 0.12:
                lit += 1
            if l > 0.5:
                bright += 1
            if cx0 <= x < cx1 and cy0 <= y < cy1:
                c_n += 1
                c_total += l
                if l > 0.12:
                    c_lit += 1
                if l > 0.5:
                    c_bright += 1
    return {
        "mean": round(total / n, 4),
        "lit%": round(100 * lit / n, 2),
        "bright%": round(100 * bright / n, 2),
        "ctrMean": round(c_total / max(1, c_n), 4),
        "ctrLit%": round(100 * c_lit / max(1, c_n), 2),
        "ctrBright%": round(100 * c_bright / max(1, c_n), 2),
    }


def main(argv):
    targets = []
    for a in argv:
        p = Path(a)
        if not p.exists():
            continue
        if p.is_dir():
            targets += sorted(p.glob("*.png"))
        else:
            targets.append(p)
    if not targets:
        print("no images")
        return 1
    rows = []
    for t in targets:
        try:
            rows.append((t.name, stats(t)))
        except Exception as exc:  # noqa: BLE001
            rows.append((t.name, {"error": str(exc)}))
    cols = ["mean", "lit%", "bright%", "ctrMean", "ctrLit%", "ctrBright%"]
    head = f"{'frame':<26}" + "".join(f"{c:>10}" for c in cols)
    print(head)
    print("-" * len(head))
    for name, s in rows:
        if "error" in s:
            print(f"{name:<26}  {s['error']}")
            continue
        print(f"{name:<26}" + "".join(f"{s[c]:>10}" for c in cols))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
