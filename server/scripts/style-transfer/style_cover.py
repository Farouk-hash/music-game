# server/scripts/style-transfer/style_cover.py
#
# End-to-end: source audio → instrumental stem → style-transfer instrumental.
#
# Pipeline:
#   1. Demucs --two-stems=vocals → keeps the "no_vocals" stem as instrumental.mp3
#   2. ACE-Step API (localhost:8001) in cover mode → styled instrumental

import os
import sys
import requests
import shutil

# ═══════════════════════════════════════════════════════════════
# CRITICAL: Register FFmpeg DLLs BEFORE importing torch / torchaudio.
# On Windows, Python 3.8+ ignores PATH for DLL loading.
# ═══════════════════════════════════════════════════════════════
FFMPEG_BIN = r"C:\Tools\ffmpeg\bin"
if os.path.exists(FFMPEG_BIN):
    os.add_dll_directory(FFMPEG_BIN)
    os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

import argparse
import json
import re
import subprocess
import time
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────
FFMPEG       = os.path.join(FFMPEG_BIN, "ffmpeg.exe")
DEMUCS       = "demucs"
DEFAULT_OUT  = Path(r"E:\matb3aa-game\server\style-transfer-output")
ACE_API_BASE = "http://127.0.0.1:8001"
ACE_STEP_ROOT = Path(r"E:\matb3aa-game\tools\ACE-Step-1.5")


def slugify(name: str) -> str:
    s = re.sub(r"[^\w\s-]", "", name).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:60] or "track"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def run(cmd, cwd=None, check=True):
    print(f"\n$ {' '.join(str(c) for c in cmd)}", flush=True)
    proc = subprocess.run(cmd, cwd=cwd, check=False)
    if check and proc.returncode != 0:
        raise SystemExit(f"Command failed (exit {proc.returncode})")
    return proc.returncode


# ── Step 1: instrument isolation ──────────────────────────────
def extract_instrumental(input_audio: Path, output_dir: Path) -> Path:
    """
    Run Demucs with --two-stems=vocals. Keeps no_vocals and converts to mp3.
    """
    print("\n── Step 1: Separate vocals → keep instrumental ──")

    run([
        DEMUCS,
        "-n", "htdemucs",
        "--two-stems=vocals",
        "--mp3",
        "--mp3-bitrate", "128",
        "-o", str(output_dir),
        str(input_audio),
    ])

    track_slug = input_audio.stem
    no_vocals_mp3 = output_dir / "htdemucs" / track_slug / "no_vocals.mp3"
    
    if not no_vocals_mp3.exists():
        # Fallback check for WAV
        no_vocals_wav = output_dir / "htdemucs" / track_slug / "no_vocals.wav"
        if no_vocals_wav.exists():
            instrumental_mp3 = output_dir / "instrumental.mp3"
            run([
                FFMPEG, "-y", "-i", str(no_vocals_wav),
                "-vn", "-acodec", "libmp3lame", "-q:a", "4",
                str(instrumental_mp3),
            ])
            print(f"✓ Instrumental: {instrumental_mp3}")
            return instrumental_mp3
        raise SystemExit(f"Expected instrumental at {no_vocals_mp3} but it wasn't produced")

    instrumental_mp3 = output_dir / "instrumental.mp3"
    run([
        FFMPEG, "-y", "-i", str(no_vocals_mp3),
        "-vn", "-acodec", "libmp3lame", "-q:a", "4",
        str(instrumental_mp3),
    ])
    print(f"✓ Instrumental: {instrumental_mp3}")
    return instrumental_mp3


# ── Step 2: ACE-Step cover (via API) ──────────────────────────
def render_cover(instrumental_mp3: Path, output_dir: Path, style: str) -> Path:
    print(f"\n── Step 2: ACE-Step cover ({style}) ──")

    output_mp3 = output_dir / f"cover-{slugify(style)}.mp3"

    # ── 1. Init the DiT model
    print("  Loading ACE-Step model...")
    try:
        init_resp = requests.post(
            f"{ACE_API_BASE}/v1/init",
            json={"model": "acestep-v15-base", "init_llm": False},
            timeout=300,
        )
        init_resp.raise_for_status()
        print("  ✓ Model loaded")
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"Failed to connect to ACE-Step API (is it running on port 8001?): {e}")

    # ── 2. Stage the audio file inside the ACE-Step folder
    # The API rejects absolute paths. We must copy the file into the
    # ACE-Step project root and send a relative path.
    staged_audio_name = "src_audio.mp3"
    staged_audio_path = ACE_STEP_ROOT / staged_audio_name
    
    print(f"  Staging audio for API...")
    shutil.copy(str(instrumental_mp3), str(staged_audio_path))

    # ── 3. Submit the cover job
    caption = f"{style} instrumental cover, {style_prompt(style)}"
    payload = {
        "prompt": caption,
        "lyrics": "[instrumental]",
        "src_audio_path": staged_audio_name,  # Relative path!
        "task_type": "cover",
        "audio_cover_strength": 0.7,
        "cover_noise_strength": 0.5,
        "inference_steps": 20,
        "audio_format": "mp3",
        "guidance_scale": 7.0,
        "batch_size": 1,
    }
    print(f"  Submitting job (this may take a few minutes on CPU)...")
    
    try:
        resp = requests.post(f"{ACE_API_BASE}/release_task", json=payload, timeout=30)
        if not resp.ok:
            print(f"\n  ✗ API returned {resp.status_code}")
            print(f"  Response body: {resp.text[:2000]}")
            print(f"\n  Payload sent:")
            print(json.dumps(payload, indent=2))
            resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"Job submit failed: {e}")

    # Extract task_id (check nested shapes)
    task_id = data.get("task_id") or data.get("id")
    if not task_id and "data" in data and isinstance(data["data"], dict):
        task_id = data["data"].get("task_id") or data["data"].get("id")

    if not task_id:
        raise SystemExit(f"Could not extract task_id from response: {data}")

    print(f"  ✓ Job submitted (task_id={task_id})")

    # ── 4. Poll /query_result
    audio_url = None
    while True:
        try:
            poll = requests.post(f"{ACE_API_BASE}/query_result", json={"task_id": task_id}, timeout=30)
            poll.raise_for_status()
            status = poll.json()
        except requests.exceptions.RequestException as e:
            print(f"  Poll error: {e}. Retrying...")
            time.sleep(5)
            continue

        if isinstance(status, dict) and "data" in status and isinstance(status["data"], dict):
            status = status["data"]

                # Log the full response periodically so we can see what's happening
        print(f"  … {status}")

        # Some servers return "progress: 0.5" and status "processing"
        state = str(
            status.get("status")
            or status.get("state")
            or status.get("phase")
            or "unknown"
        ).lower()

        # Broad "done" detection
        if any(k in status for k in ("audio_url", "result_url", "output_url", "url")):
            audio_url = (
                status.get("audio_url")
                or status.get("url")
                or status.get("result_url")
                or status.get("output_url")
                or (status.get("result") or {}).get("audio_url")
                or (status.get("result") or {}).get("url")
            )
            if audio_url:
                break

        if state in ("completed", "success", "done", "finished", "complete"):
            # Try once more to find the URL
            audio_url = (
                status.get("audio_url")
                or status.get("url")
                or status.get("result_url")
                or (status.get("result") or {}).get("audio_url")
                or (status.get("result") or {}).get("url")
            )
            if audio_url:
                break
            # If no URL but marked done, log and keep going
            print(f"  ⚠ status={state} but no URL found — continuing")
            time.sleep(5)
            continue

        if state in ("failed", "error"):
            raise SystemExit(f"Generation failed: {status.get('error') or status}")

        time.sleep(5)
        
    if not audio_url:
        raise SystemExit(f"No audio URL in completed result: {status}")

    # ── 5. Download the result
    print(f"  Downloading: {audio_url}")
    if not audio_url.startswith("http"):
        audio_url = f"{ACE_API_BASE}{audio_url}"
    
    try:
        audio_resp = requests.get(audio_url, timeout=120)
        audio_resp.raise_for_status()
        output_mp3.write_bytes(audio_resp.content)
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"Failed to download output: {e}")
    finally:
        # Clean up the staged file
        if staged_audio_path.exists():
            staged_audio_path.unlink()

    print(f"✓ Cover: {output_mp3}")
    return output_mp3


def style_prompt(style: str) -> str:
    presets = {
        "jazz":     "smooth saxophone, upright bass, brushed drums, lounge piano, warm vinyl",
        "rock":     "distorted electric guitar, driving drums, punchy bass, arena rock feel",
        "lofi":     "warm tape hiss, mellow keys, soft breakbeat, relaxed hip-hop groove",
        "synth":    "retro synthwave, pulsing analog bass, gated drums, neon pads",
        "acoustic": "strummed acoustic guitar, soft percussion, intimate room mic",
    }
    return presets.get(style.lower(), f"authentic {style} instrumentation")


# ── Entry ─────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", help="Path to the source audio file (mp3/wav)")
    ap.add_argument("--instrumental", help="Path to an already-extracted no_vocals.mp3 (skips Demucs)")
    ap.add_argument("--style", default="jazz", help="Target style (jazz, rock, lofi, etc.)")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="Output root directory")
    ap.add_argument("--skip-cover", action="store_true", help="Only run instrumental separation")
    args = ap.parse_args()

    if not args.input and not args.instrumental:
        raise SystemExit("Provide either --input (source audio) or --instrumental (pre-extracted)")

    started = time.time()
    out_root = Path(args.out)

    # ── Step 1: get an instrumental ───────────────────────────
    if args.instrumental:
        # Use a pre-existing instrumental — skip Demucs entirely.
        instrumental = Path(args.instrumental).expanduser().resolve()
        if not instrumental.exists():
            raise SystemExit(f"Instrumental file not found: {instrumental}")

        # Derive the slug from the Demucs layout:
        #   <out_root>/<slug>/htdemucs/<track>/no_vocals.mp3
        p = instrumental.parent
        while p.name and p.name != "htdemucs" and p.parent != p:
            p = p.parent
        slug = p.parent.name if p.name == "htdemucs" else slugify(instrumental.stem)
        output_dir = out_root / slug
        ensure_dir(output_dir)

        print(f"\n── Skipping Demucs — using existing instrumental ──")
        print(f"  Source: {instrumental}")
        print(f"  Output: {output_dir}")

        # Normalize to <output_dir>/instrumental.mp3 so ACE-Step has a stable
        # path and the cover lands next to a known file.
        instrumental_final = output_dir / "instrumental.mp3"
        if instrumental.resolve() != instrumental_final.resolve():
            run([
                FFMPEG, "-y", "-i", str(instrumental),
                "-vn", "-acodec", "libmp3lame", "-q:a", "4",
                str(instrumental_final),
            ])
        instrumental = instrumental_final

    else:
        input_audio = Path(args.input).expanduser().resolve()
        if not input_audio.exists():
            raise SystemExit(f"Source file not found: {input_audio}")

        slug = slugify(input_audio.stem)
        output_dir = out_root / slug
        ensure_dir(output_dir)

        instrumental = extract_instrumental(input_audio, output_dir)

    # ── Step 2: generate the styled cover ─────────────────────
    if args.skip_cover:
        print("\n(Skipped ACE-Step — pass --skip-cover to skip.)")
        cover = None
    else:
        cover = render_cover(instrumental, output_dir, args.style)

    # ── Metadata ──────────────────────────────────────────────
    elapsed = round(time.time() - started, 1)
    meta = {
        "source":       args.instrumental or args.input,
        "slug":         output_dir.name,
        "style":        args.style,
        "instrumental": str(instrumental),
        "cover":        str(cover) if cover else None,
        "elapsed_s":    elapsed,
    }
    (output_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"\n✓ Done in {elapsed}s")
    print(f"  Output: {output_dir}")
    for k, v in meta.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()