# server/scripts/style-transfer/test_cover.py
#
# Minimal test for ACE-Step "cover" mode.
#
# FIX vs v1: /query_result returns {"data": [], ...} forever even after the
# MP3 is written to .cache/acestep/tmp/api_audio/. So we watch the filesystem
# for the newest .mp3 after submitting, instead of trusting the API.
#
# v2 change: prompt is now just "smooth jazz" (no instrument list) to test
# whether the model responds better to a clean genre tag than a comma-
# separated instrument spec.

import os
import json
import time
import argparse
import shutil
import requests
from pathlib import Path

# ── FFmpeg DLLs (Windows) ─────────────────────────────────────
FFMPEG_BIN = r"C:\Tools\ffmpeg\bin"
if os.path.exists(FFMPEG_BIN):
    os.add_dll_directory(FFMPEG_BIN)
    os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

ACE_API_BASE = "http://127.0.0.1:8001"
ACE_STEP_ROOT = Path(r"E:\matb3aa-game\tools\ACE-Step-1.5")
API_AUDIO_DIR = ACE_STEP_ROOT / ".cache" / "acestep" / "tmp" / "api_audio"
STAGED_NAME   = "src_audio.mp3"
DEFAULT_OUT   = Path(r"E:\matb3aa-game\server\style-transfer-output\test-cover")

MAX_WAIT_SEC  = 900
POLL_INTERVAL = 5


def slugify(name: str) -> str:
    import re
    s = re.sub(r"[^\w\s-]", "", name).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:60] or "track"


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def init_model():
    print("\n-- Init ACE-Step (acestep-v15-base) --")
    try:
        r = requests.post(
            f"{ACE_API_BASE}/v1/init",
            json={"model": "acestep-v15-base", "init_llm": False},
            timeout=300,
        )
        r.raise_for_status()
        print("  OK Model loaded")
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"ACE-Step API unreachable on {ACE_API_BASE}: {e}")


def stage_audio(input_audio: Path) -> str:
    staged_path = ACE_STEP_ROOT / STAGED_NAME
    print(f"\n-- Staging audio --")
    print(f"  From: {input_audio}")
    print(f"  To  : {staged_path}")
    shutil.copy(str(input_audio), str(staged_path))
    return STAGED_NAME


def snapshot_api_audio() -> set:
    if not API_AUDIO_DIR.exists():
        return set()
    return {p.name for p in API_AUDIO_DIR.glob("*.mp3")}


def newest_mp3_since(baseline: set) -> Path | None:
    if not API_AUDIO_DIR.exists():
        return None
    candidates = [p for p in API_AUDIO_DIR.glob("*.mp3") if p.name not in baseline]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def submit_task(style: str, lyrics: str = "[instrumental]") -> str:
    # ── Payload: prompt is just "smooth jazz", nothing else ──
    payload = {
        "prompt": style,                       # <-- e.g. "smooth jazz"
        "lyrics": lyrics,
        "src_audio_path": STAGED_NAME,
        "task_type": "cover",
        "cover_noise_strength": 0.0,
        "audio_cover_strength": 0.65,
        "inference_steps": 10,
        "guidance_scale": 7.0,
        "audio_format": "mp3",
        "batch_size": 1,
    }
    print(f"\n-- Submitting cover task --")
    print(json.dumps(payload, indent=2))

    r = requests.post(f"{ACE_API_BASE}/release_task", json=payload, timeout=30)
    if not r.ok:
        print(f"\nX API {r.status_code}: {r.text[:2000]}")
        r.raise_for_status()
    data = r.json()

    task_id = data.get("task_id") or data.get("id")
    if not task_id and isinstance(data.get("data"), dict):
        task_id = data["data"].get("task_id") or data["data"].get("id")
    if not task_id:
        raise SystemExit(f"No task_id in response: {data}")

    print(f"  OK Submitted (task_id={task_id})")
    return task_id


def wait_for_output(task_id: str, baseline: set) -> Path:
    print(f"\n-- Waiting for output (up to {MAX_WAIT_SEC}s) --")
    print(f"  Watching: {API_AUDIO_DIR}")

    start = time.time()
    attempt = 0
    while True:
        attempt += 1
        elapsed = int(time.time() - start)

        # Opportunistic API check (may return {"data": [], ...} forever — ignore)
        try:
            pr = requests.post(
                f"{ACE_API_BASE}/query_result",
                json={"task_id": task_id},
                timeout=10,
            )
            if pr.ok:
                body = pr.json()
                inner = body["data"] if isinstance(body.get("data"), dict) else body
                state = str(inner.get("status") or inner.get("state") or "").lower()
                if state in ("failed", "error"):
                    raise SystemExit(f"Generation failed: {inner.get('error') or inner}")
        except requests.exceptions.RequestException:
            pass

        # The reliable path: filesystem watcher
        found = newest_mp3_since(baseline)
        if found is not None:
            try:
                sz1 = found.stat().st_size
                time.sleep(0.5)
                sz2 = found.stat().st_size
                if sz1 == sz2 and sz2 > 0:
                    print(f"\n  OK Detected output file: {found}")
                    return found
            except FileNotFoundError:
                pass

        if attempt % 6 == 0:
            print(f"  [{attempt}] {elapsed}s elapsed — still generating...")

        if elapsed > MAX_WAIT_SEC:
            raise SystemExit(
                f"Timeout after {MAX_WAIT_SEC}s. No file in {API_AUDIO_DIR}. "
                f"Check the server terminal for errors."
            )

        time.sleep(POLL_INTERVAL)


def fetch_output(src_path: Path, out_mp3: Path):
    shutil.copy(str(src_path), str(out_mp3))
    print(f"\n-- Copied generated MP3 --")
    print(f"  From: {src_path}")
    print(f"  To  : {out_mp3}")
    try:
        src_path.unlink()
    except OSError:
        pass


def cleanup_staged():
    staged = ACE_STEP_ROOT / STAGED_NAME
    if staged.exists():
        staged.unlink()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Path to source audio")
    ap.add_argument("--style", default="smooth jazz",
                    help="Target style description (default: 'smooth jazz')")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="Output root folder")
    args = ap.parse_args()

    src = Path(args.input).resolve()
    if not src.exists():
        raise SystemExit(f"Source file not found: {src}")

    out_root = Path(args.out)
    ensure_dir(out_root)

    slug = slugify(src.stem)
    out_dir = out_root / slug
    ensure_dir(out_dir)
    out_mp3 = out_dir / f"cover-{slugify(args.style)}.mp3"

    started = time.time()

    try:
        init_model()
        baseline = snapshot_api_audio()
        print(f"  Baseline: {len(baseline)} existing file(s) in api_audio/")
        stage_audio(src)
        task_id = submit_task(args.style)
        result = wait_for_output(task_id, baseline)
        fetch_output(result, out_mp3)
    finally:
        cleanup_staged()

    elapsed = round(time.time() - started, 1)
    meta = {
        "source": str(src),
        "style": args.style,
        "cover": str(out_mp3),
        "parameters": {
            "task_type": "cover",
            "cover_noise_strength": 0.0,
            "audio_cover_strength": 0.65,
            "inference_steps": 10,
            "guidance_scale": 7.0,
        },
        "elapsed_s": elapsed,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"\nDone in {elapsed}s")
    print(f"  Output: {out_mp3}")


if __name__ == "__main__":
    main()