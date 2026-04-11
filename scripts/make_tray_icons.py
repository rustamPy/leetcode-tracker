#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image

ASSETS_DIR = Path(__file__).parent.parent / "menubar-app" / "assets"
SIZES = {
    "tray-icon.png": 16,
    "tray-icon@2x.png": 32,
}


def convert(src: Path) -> None:
    img = Image.open(src).convert("RGBA")
    for filename, size in SIZES.items():
        resized = img.resize((size, size), Image.LANCZOS)
        out = ASSETS_DIR / filename
        resized.save(out, "PNG")
        print(f"Saved {out} ({size}x{size})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/make_tray_icons.py <path-to-image>")
        sys.exit(1)

    src = Path(sys.argv[1])
    if not src.exists():
        print(f"Error: file not found: {src}")
        sys.exit(1)

    convert(src)
