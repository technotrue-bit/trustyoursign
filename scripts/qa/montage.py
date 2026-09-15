"""Montage a directory of same-size frames into a labelled grid.

    python scripts/qa/montage.py <dir> <out.png> [cols] [glob]

Frames are sorted by filename, so `00-aries-mid.png` … `11-pisces-mid.png` land
in sign order. ffmpeg's glob demuxer is not available in every Windows build —
this does not depend on it.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    src = Path(argv[0])
    out = Path(argv[1])
    cols = int(argv[2]) if len(argv) > 2 else 4
    pattern = argv[3] if len(argv) > 3 else "*.png"
    files = sorted(p for p in src.glob(pattern) if p.name != out.name)
    if not files:
        print(f"no frames matching {pattern} in {src}")
        return 1
    thumbs = [Image.open(f).convert("RGB") for f in files]
    w, h = thumbs[0].size
    rows = (len(thumbs) + cols - 1) // cols
    pad = 2
    label_h = 14
    grid = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + label_h + pad) + pad), (8, 8, 10))
    draw = ImageDraw.Draw(grid)
    for i, (img, f) in enumerate(zip(thumbs, files)):
        cx = pad + (i % cols) * (w + pad)
        cy = pad + (i // cols) * (h + label_h + pad)
        grid.paste(img.resize((w, h)), (cx, cy))
        draw.text((cx + 2, cy + h + 1), f.stem[:44], fill=(200, 190, 170))
    grid.save(out)
    print(f"{out} — {len(files)} frames, {cols} cols")
    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
