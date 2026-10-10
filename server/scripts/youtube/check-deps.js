// server/scripts/youtube/check-deps.js
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Best-effort .env loader. Searches common locations relative to the
 * current working directory. Does not overwrite variables that are
 * already set in the shell.
 */
function loadDotEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(process.cwd(), '..', '..', '..', '.env'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
    return p;
  }
  return null;
}

const envPath = loadDotEnv();
if (envPath) console.log(`Loaded env from: ${envPath}\n`);

const IS_WINDOWS = process.platform === 'win32';
const YTDLP_CMD  = process.env.YTDLP_PATH  ?? (IS_WINDOWS ? 'yt-dlp.exe'  : 'yt-dlp');
const FFMPEG_CMD = process.env.FFMPEG_PATH ?? 'ffmpeg';

function check(label, cmd, versionArg) {
  const r = spawnSync(cmd, [versionArg], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    const hint = r.error?.code === 'ENOENT'
      ? 'NOT FOUND — check PATH or the corresponding *_PATH in .env'
      : `FAILED (${r.error?.message ?? `exit ${r.status}`})`;
    console.log(`✗ ${label}: ${hint}`);
    console.log(`   tried: ${cmd}`);
    return false;
  }
  const first = (r.stdout || r.stderr || '').split('\n')[0].trim();
  console.log(`✓ ${label}: ${first}`);
  console.log(`   resolved to: ${cmd}`);
  return true;
}

console.log('Checking dependencies…\n');
const ok1 = check('yt-dlp', YTDLP_CMD, '--version');
const ok2 = check('ffmpeg', FFMPEG_CMD, '-version');

console.log('');
if (ok1 && ok2) {
  console.log('All dependencies present.');
  process.exit(0);
} else {
  console.log('Missing dependencies. Fix the paths and retry.');
  process.exit(1);
}