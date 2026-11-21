// rebuild-pools.js
const ADMIN_KEY = 'aB3xK9mN2pQ7rT4v'; // Your actual admin key
const BASE_URL = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

async function rebuildPools() {
  let offset = 0;
  let done = false;
  let totalArtists = 0;

  console.log('🚀 Starting v2 pool rebuild...\n');

  while (!done) {
    console.log(`⏳ Building chunk: offset=${offset}, limit=25`);
    
    try {
      const res = await fetch(`${BASE_URL}/game/catalog/invalidate?admin_key=${ADMIN_KEY}&offset=${offset}&limit=25`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      console.log(` Success: ${data.built} artists built. Duration: ${data.durationMs}ms`);
      
      if (totalArtists === 0 && data.totalArtists) {
        totalArtists = data.totalArtists;
        console.log(`📊 Total artists to process: ${totalArtists}\n`);
      }

      if (data.done) {
        done = true;
      } else {
        offset = data.nextOffset;
        // Pause 300ms to be polite to Cloudflare's free tier limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error('❌ Build failed:', err.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 v2 Pool Rebuild Complete! Your game is now ready.');
}

rebuildPools();