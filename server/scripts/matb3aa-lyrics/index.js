#!/usr/bin/env node
/**
 * Orchestrator: search-tracks.js → fetch-lyrics.js
 *
 * Usage:
 *   node scripts/matb3aa-lyrics/index.js
 *   node scripts/matb3aa-lyrics/index.js --artist=65
 *   node scripts/matb3aa-lyrics/index.js --fresh
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEARCHER = join(__dirname, 'search-tracks.js');
const FETCHER  = join(__dirname, 'fetch-lyrics.js');

function run(scriptPath, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ node ${scriptPath} ${args.join(' ')}\n`);
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);

  await run(SEARCHER, args);
  await run(FETCHER, args);

  console.log('\n════════════ Done ════════════');
  console.log('Outputs:');
  console.log('  search-results.json');
  console.log('  lyrics-bodies.json');
}

main().catch(err => {
  console.error('\n❌ Orchestrator failed:', err.message);
  process.exit(1);
});