"""Turn raw photos (ai-evals/inbox/) into eval cases: strip metadata, file, draft keys.

    python ai-evals/prepare_cases.py ai-evals/inbox/drafts.json

`drafts.json` lists, for each inbox file, its feature (menu / dish / document / junk), a case
id and a DRAFT answer key transcribed by a person looking at the image (never by the app's
AI endpoints: a test must not grade itself). For every entry this script:

1. re-encodes the image from its pixels only (JPEG, quality 92): EXIF, GPS, ICC profiles,
   comments and any other metadata are dropped; the visual content is unchanged;
2. writes cases/<feature>/<id>/image.jpg and expected.json with "status": "draft";
3. checks the written JPEG has no metadata left.

Real images and their expected.json stay out of git (ai-evals/.gitignore). Needs Pillow.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
FEATURES = ("menu", "dish", "document", "junk")


def strip_and_save(src: Path, dest: Path) -> tuple[int, int]:
    """Copy only the pixels into a new image and save it as JPEG with no metadata."""
    with Image.open(src) as im:
        rgb = im.convert("RGB")
        clean = Image.new("RGB", rgb.size)
        clean.paste(rgb)  # pixels only: no info, exif or icc_profile carried over
    dest.parent.mkdir(parents=True, exist_ok=True)
    clean.save(dest, "JPEG", quality=92, optimize=True)
    return clean.size


def has_metadata(path: Path) -> list[str]:
    with Image.open(path) as im:
        found = [
            k
            for k in im.info
            if k
            not in (
                "jfif",
                "jfif_version",
                "jfif_unit",
                "jfif_density",
                "dpi",
                "progressive",
                "progression",
            )
        ]
        if im.getexif():
            found.append("exif")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("drafts", type=Path)
    parser.add_argument("--inbox", type=Path, default=ROOT / "inbox")
    parser.add_argument(
        "--overwrite", action="store_true", help="replace existing case folders"
    )
    args = parser.parse_args()

    drafts = json.loads(args.drafts.read_text(encoding="utf-8"))
    seen: set[tuple[str, str]] = set()
    for entry in drafts["cases"]:
        feature, case_id = entry["feature"], entry["id"]
        if feature not in FEATURES:
            raise SystemExit(f"{entry['source']}: unknown feature {feature}")
        if (feature, case_id) in seen:
            raise SystemExit(f"duplicate case id {feature}/{case_id}")
        seen.add((feature, case_id))
        folder = ROOT / "cases" / feature / case_id
        if folder.exists() and not args.overwrite:
            print(f"skip {feature}/{case_id}: exists (use --overwrite)")
            continue
        src = args.inbox / entry["source"]
        width, height = strip_and_save(src, folder / "image.jpg")
        left = has_metadata(folder / "image.jpg")
        if left:
            raise SystemExit(f"{folder / 'image.jpg'}: metadata still present: {left}")
        expected = {
            **entry["expected"],
            "status": "draft",
            "source_file": entry["source"],
            "image_size": [width, height],
            "metadata_stripped": True,
            "drafted": datetime.now(UTC).date().isoformat(),
        }
        (folder / "expected.json").write_text(
            json.dumps(expected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{feature}/{case_id}: {width}x{height} <- {src.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
