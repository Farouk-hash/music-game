#!/usr/bin/env node
/**
 * Orchestrator: runs all three pipelines in sequence.
 *   1. matb3aa-lyrics   → matb3aa-lyrics/lyrics-bodies.json
 *   2. lyrics-scrapping → lyrics-scrapping/lyrics-bodies.json
 *   3. compare-sources  → lyrics-combined/lyrics-final.json
 *
 * Usage:
 *   node scripts/lyrics-combined/index.js
 *   node scripts/lyrics-combined/index.js --artist=65
 *   node scripts/lyrics-combined/index.js --fresh
 *   node scripts/lyrics-combined/index.js --skip-matb3aa
 *   node scripts/lyrics-combined/index.js --skip-lyricsnu
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MATB3AA_ORCH   = join(__dirname, '..', 'matb3aa-lyrics', 'index.js');
const LYRICSNU_ORCH  = join(__dirname, '..', 'lyrics-scrapping', 'index.js');
const COMPARE_SCRIPT = join(__dirname, 'compare-sources.js');

function run(scriptPath, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`▶ node ${scriptPath}`);
    console.log(`   ${args.length > 0 ? args.join(' ') : '(no args)'}`);
    console.log('═'.repeat(60));
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Exited with code ${code} from ${scriptPath}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const skipMatb3aa  = rawArgs.includes('--skip-matb3aa');
  const skipLyricsNu = rawArgs.includes('--skip-lyricsnu');

  // Forward only meaningful flags to children
  const passArgs = rawArgs.filter(a =>
    a.startsWith('--artist=') || a === '--fresh'
  );

  if (!skipMatb3aa) {
    await run(MATB3AA_ORCH, passArgs);
  } else {
    console.log('\n(Skipping matb3aa stage — using existing output)');
  }

  if (!skipLyricsNu) {
    await run(LYRICSNU_ORCH, passArgs);
  } else {
    console.log('\n(Skipping lyrics.nu stage — using existing output)');
  }

  await run(COMPARE_SCRIPT, []);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ All done');
  console.log('═'.repeat(60));
  console.log('Outputs:');
  console.log('  matb3aa-lyrics/lyrics-bodies.json');
  console.log('  lyrics-scrapping/lyrics-bodies.json');
  console.log('  lyrics-combined/lyrics-final.json');
}

main().catch(err => {
  console.error('\n❌ Orchestrator failed:', err.message);
  process.exit(1);
});