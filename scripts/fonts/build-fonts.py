# Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
#
# Subsets Plus Jakarta Sans (roman and italic, variable weight 200-800) to the
# characters Pelana uses, writes WOFF2 into public/fonts/, reads each file back
# to check it, and prints the metric overrides for the fallback @font-face so
# the swap from Arial to the web font does not shift the layout.
#
# Run from the repository root:
#   PYTHONPATH=scripts/fonts/brotli_shim python3 scripts/fonts/build-fonts.py
#
# The brotli shim is only needed when the `brotli` package is not installed.

import io
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "fonts-src")
OUT = os.path.join(ROOT, "public", "fonts")

FACES = [
    ("PlusJakartaSans[wght].ttf", "plus-jakarta-sans.woff2"),
    ("PlusJakartaSans-Italic[wght].ttf", "plus-jakarta-sans-italic.woff2"),
]

# Basic Latin, Latin-1, and the punctuation and symbols the copy and the
# charts use: dashes, quotes, bullet, ellipsis, primes, minus, approx, le/ge,
# arrows, thin space, superscript digits, fraction slash.
UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x2009, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E]
    + [0x2022, 0x2026, 0x2032, 0x2033, 0x2039, 0x203A, 0x2044]
    + [0x2070] + list(range(0x2074, 0x207A))
    + [0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2248, 0x2264, 0x2265]
)

SAMPLE = (
    "Dengue is counted in days. This count starts thirty days before the fever, "
    "on the wall of a bak mandi, a few millimetres above the water. "
    "Demam berdarah dihitung per hari. Hitungan ini dimulai tiga puluh hari "
    "sebelum demam, di dinding bak mandi, beberapa milimeter di atas air. "
    "Trombosit turun, hematokrit naik. Segera ke IGD jika ada tanda bahaya."
)


def make_subset(src_path):
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_languages = [0x0409]
    options.hinting = False
    options.notdef_outline = True
    options.glyph_names = False
    options.flavor = "woff2"
    font = subset.load_font(src_path, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    return font, options


def advance_width(font, text):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    total = 0
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            continue
        total += hmtx[name][0]
    return total / upm


def main():
    os.makedirs(OUT, exist_ok=True)
    report = {}
    for src_name, out_name in FACES:
        src_path = os.path.join(SRC, src_name)
        font, options = make_subset(src_path)
        out_path = os.path.join(OUT, out_name)
        subset.save_font(font, out_path, options)

        # Read the WOFF2 back. A broken file fails here, not in a browser.
        check = TTFont(out_path)
        cmap = check.getBestCmap()
        missing = [hex(u) for u in UNICODES if u not in cmap and u not in (0xAD,)]
        report[out_name] = {
            "bytes": os.path.getsize(out_path),
            "source_bytes": os.path.getsize(src_path),
            "glyphs": len(check.getGlyphOrder()),
            "axes": [(a.axisTag, a.minValue, a.maxValue) for a in check["fvar"].axes],
            "missing": missing,
        }

    # Fallback metrics against Liberation Sans, which shares Arial's metrics.
    web = TTFont(os.path.join(SRC, FACES[0][0]))
    arial = TTFont("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf")
    size_adjust = advance_width(web, SAMPLE) / advance_width(arial, SAMPLE)
    upm = web["head"].unitsPerEm
    hhea = web["hhea"]
    report["fallback"] = {
        "size-adjust": f"{size_adjust * 100:.2f}%",
        "ascent-override": f"{hhea.ascent / upm / size_adjust * 100:.2f}%",
        "descent-override": f"{-hhea.descent / upm / size_adjust * 100:.2f}%",
        "line-gap-override": f"{hhea.lineGap / upm / size_adjust * 100:.2f}%",
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    sys.exit(main())
