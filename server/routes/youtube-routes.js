// server/routes/youtube-routes.js
import { Router } from 'express';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const router = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTRACT_SCRIPT = join(__dirname, '..', 'scripts', 'youtube', 'extract-playlist.js');

/**
 * POST /api/youtube/extract-playlist
 * Body: { url: "<youtube playlist or video url>" }
 * Response: { ok, count, videos: [{ index, videoId, title, durationSec, url, uploader }] }
 *
 * Spawns extract-playlist.js and parses its JSON stdout.
 * Fast (~3-10s for a 40-video playlist) — synchronous response is fine.
 */
router.post('/youtube/extract-playlist', async (req, res) => {
  const url = String(req.body?.url ?? '').trim();

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return res.status(400).json({ error: 'Not a valid YouTube URL' });
  }
  if (!existsSync(EXTRACT_SCRIPT)) {
    return res.status(500).json({ error: `Script not found: ${EXTRACT_SCRIPT}` });
  }

  let stdout = '';
  let stderr = '';

  const child = spawn(process.execPath, [EXTRACT_SCRIPT, url], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
  child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });

  // Hard timeout — never hang the request forever.
  const timeout = setTimeout(() => {
    child.kill('SIGKILL');
  }, 60_000);

  child.on('error', (e) => {
    clearTimeout(timeout);
    console.error('[youtube/extract-playlist] spawn error:', e);
    res.status(500).json({ error: `Failed to spawn script: ${e.message}` });
  });

  child.on('exit', (code) => {
    clearTimeout(timeout);

    if (code !== 0) {
      console.error('[youtube/extract-playlist] script failed:', stderr.slice(0, 1000));
      return res.status(502).json({
        error: `yt-dlp failed (exit ${code})`,
        stderr: stderr.slice(0, 2000),
      });
    }

    let videos;
    try {
      videos = JSON.parse(stdout);
    } catch (e) {
      console.error('[youtube/extract-playlist] invalid JSON:', stdout.slice(0, 500));
      return res.status(502).json({ error: 'Script returned invalid JSON' });
    }

    if (!Array.isArray(videos)) {
      return res.status(502).json({ error: 'Script did not return an array' });
    }

    res.json({
      ok: true,
      count: videos.length,
      videos,
    });
  });
});

export default router;