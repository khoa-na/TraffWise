#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import shutil
import urllib.request
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "backend/api/data"
MANIFEST = json.loads((ROOT / "assets-manifest.json").read_text())


def digest(path):
    checksum = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def valid(path, asset):
    return (path.is_file() and path.stat().st_size == asset["size"]
            and digest(path) == asset["sha256"])


def download(asset):
    target = DATA_DIR / asset["path"]
    if valid(target, asset):
        print(f"OK       {asset['path']}")
        return

    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(target.suffix + ".part")
    url = (f"https://huggingface.co/datasets/{MANIFEST['repo_id']}/resolve/"
           f"{MANIFEST['revision']}/{quote(asset['path'])}?download=true")
    offset = partial.stat().st_size if partial.exists() else 0
    request = urllib.request.Request(url, headers={"Range": f"bytes={offset}-"})

    print(f"DOWNLOAD {asset['path']}")
    with urllib.request.urlopen(request) as response:
        mode = "ab" if offset and response.status == 206 else "wb"
        with partial.open(mode) as output:
            shutil.copyfileobj(response, output, length=1024 * 1024)

    if partial.stat().st_size != asset["size"] or digest(partial) != asset["sha256"]:
        raise RuntimeError(f"Checksum failed: {asset['path']}")
    os.replace(partial, target)


def main():
    parser = argparse.ArgumentParser(description="Download TraffWise runtime assets")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    missing = []
    for asset in MANIFEST["files"]:
        target = DATA_DIR / asset["path"]
        if args.verify_only:
            if not valid(target, asset):
                missing.append(asset["path"])
        else:
            download(asset)

    if missing:
        print("Missing or invalid assets:")
        print("\n".join(f"  {path}" for path in missing))
        raise SystemExit(1)
    print(f"Verified {len(MANIFEST['files'])} assets.")


if __name__ == "__main__":
    main()
