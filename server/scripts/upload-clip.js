// server/scripts/upload-clip.js
import 'dotenv/config';
import { publishClip } from '../lib/publish-clip.js';

const TRACK_ID = 54398;
const ARTIST_ID = 84;
const TRACK_NAME = 'Test Track';
const TRACK_SRC = 'storage/media/اغنية مكاني الصح - موقع مطبعه.mp3';
const POSITION = 'start';
const CLIP_SECONDS = 10;

async function main() {
  console.log('🎵 Upload clip flow');
  console.log('  track:', TRACK_ID);
  console.log('  position:', POSITION);
  console.log('  duration:', CLIP_SECONDS, 's');
  console.log('');

  const result = await publishClip({
    trackId: TRACK_ID,
    sourceSrc: TRACK_SRC,
    name: TRACK_NAME,
    artistId: ARTIST_ID,
    position: POSITION,
    seconds: CLIP_SECONDS,
    label: 'Intro',
    onProgress: (stage, data) => {
      console.log(`  → ${stage}`, data ?? '');
    },
  });

  console.log('');
  console.log('✅ Done. Clip is at:', result.r2_key);
  console.log('   Play at:', result.serveUrl);
  console.log('   Timings:', result.timings);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});