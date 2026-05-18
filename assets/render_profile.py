#!/usr/bin/env python3
"""
Render the holdpoint mark as a square profile-icon PNG.

Produces a 1024×1024 PNG with the mark centered on an ink background,
sized so it stays readable even when platforms crop the avatar to a circle.

Usage:
    python3 render_profile.py                # default: 1024px, ink bg, bone mark
    python3 render_profile.py 512            # different size
    python3 render_profile.py 1024 light     # bone bg, ink mark
"""

import sys
import cairosvg
from pathlib import Path

INK = "#0B0F14"
BONE = "#F5F1E8"

# Inscribed-circle-safe zone: mark fits inside this fraction of the canvas
SAFE_FRACTION = 0.62

# The mark's source viewBox is 100×100 with content from roughly (4,10) to (96,90)
MARK_SVG = """\
<g stroke="{fg}" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" fill="none">
  <path d="M 4 10 C 24 10 36 30 44 46"/>
  <path d="M 4 32 C 24 32 36 42 44 48"/>
  <path d="M 4 68 C 24 68 36 58 44 52"/>
  <path d="M 4 90 C 24 90 36 70 44 54"/>
</g>
<rect x="42" y="36" width="14" height="28" rx="3" fill="{fg}"/>
<path d="M 56 50 L 96 50" stroke="{fg}" stroke-width="7" stroke-linecap="round" fill="none"/>
"""


def build_svg(size: int, bg: str, fg: str) -> str:
    """Compose a square SVG with the mark centered on a background."""
    inner = size * SAFE_FRACTION
    offset = (size - inner) / 2
    scale = inner / 100  # mark source is 100 units wide
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect width="{size}" height="{size}" fill="{bg}"/>
  <g transform="translate({offset:.2f},{offset:.2f}) scale({scale:.4f})">
    {MARK_SVG.format(fg=fg)}
  </g>
</svg>"""


def main() -> None:
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
    mode = sys.argv[2] if len(sys.argv) > 2 else "dark"

    bg, fg = (INK, BONE) if mode == "dark" else (BONE, INK)

    out_dir = Path(__file__).parent
    out_path = out_dir / f"profile-{mode}-{size}.png"

    svg = build_svg(size, bg, fg)
    cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        output_width=size,
        output_height=size,
        write_to=str(out_path),
    )

    print(f"wrote {out_path}  ({size}×{size}, {mode})")


if __name__ == "__main__":
    main()
