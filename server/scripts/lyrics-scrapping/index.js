#!/usr/bin/env node
/**
 * Orchestrator: runs match-lyrics-nu.js then fetch-lyrics-bodies.js
 * in sequence. Same CLI flags pass through.
 *
 * Usage:
 *   node scripts/lyrics-scrapping/index.js
 *   node scripts/lyrics-scrapping/index.js --artist=65
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATCHER  = join(__dirname, 'match-lyrics-nu.js');
const FETCHER  = join(__dirname, 'fetch-lyrics-bodies.js');

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

  // Step 1: crawl singer pages and match track names to song URLs
  await run(MATCHER, args);

  // Step 2: fetch lyrics bodies for every matched song URL
  await run(FETCHER, args);

  console.log('\n════════════ Done ════════════');
  console.log('Outputs:');
  console.log('  lyrics-matches.json');
  console.log('  lyrics-bodies.json');
}

main().catch(err => {
  console.error('\n❌ Orchestrator failed:', err.message);
  process.exit(1);
});