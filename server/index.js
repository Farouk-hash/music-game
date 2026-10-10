// server/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { matb3aa } from './matb3aa.js';
import genresRouter from './routes/matbaa-routes/genres.js';
import artistsRouter from './routes/matbaa-routes/artists.js';
import albumsRouter from './routes/matbaa-routes/albums.js';
import searchRouter from './routes/matbaa-routes/search.js';
import cloudflareRouter from './routes/cloud-flare-routes/genres.js';
import cloudflareArtistsRouter from './routes/cloud-flare-routes/artists.js';
import cloudflareClipsRouter from './routes/cloud-flare-routes/clips.js';
import cloudflareUploadRouter from './routes/cloud-flare-routes/upload.js';
import quranRouter from './routes/matbaa-routes/quran.js';
import artistCatalogueRouter from './routes/matbaa-routes/artist-catalogue.js';
import cloudflareLyricsRouter from './routes/cloud-flare-routes/lyrics.js';
import pipelineRouter from './routes/pipeline-routes.js';
import albumatyRouter from './routes/albumaty-routes.js';
import cloudflareAlbumYearsRouter from './routes/cloud-flare-routes/album-years.js';
import youtubeRoutes from './routes/youtube-routes.js';
import instrumentalRoutes from './routes/instrumental-routes.js';
import instrumentalRemoteRoutes from './routes/cloud-flare-routes/instruments_remote.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.use((req, res, next) => {
  req.setTimeout(30 * 60 * 1000);
  res.setTimeout(30 * 60 * 1000);
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Routes
app.use('/api/genres', genresRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/search', searchRouter);
app.use('/api/cloudflare', cloudflareRouter);
app.use('/api/cloudflare', cloudflareArtistsRouter);
app.use('/api/cloudflare', cloudflareClipsRouter);
app.use('/api/quran', quranRouter);
app.use('/api/cloudflare', cloudflareUploadRouter);
app.use('/api/artists', artistCatalogueRouter);
app.use('/api/cloudflare', cloudflareLyricsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/albumaty', albumatyRouter);
app.use('/api/cloudflare', cloudflareAlbumYearsRouter);
app.use('/api/cloudflare', instrumentalRemoteRoutes);   
app.use('/api', youtubeRoutes);
app.use('/api', instrumentalRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[server]', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🎵 Server ready on http://localhost:${PORT}`);
  console.log(`   GET http://localhost:${PORT}/api/genres`);
  console.log(`   GET http://localhost:${PORT}/api/artists`);
  console.log(`   GET http://localhost:${PORT}/api/albums/:id`);
  console.log(`   GET http://localhost:${PORT}/api/search?q=...&type=artists`);
  console.log(`   GET http://localhost:${PORT}/api/cloudflare/ping`);
});

matb3aa.warmup()
  .then(() => console.log('[matb3aa] warmup complete'))
  .catch(err => console.warn('[matb3aa] warmup failed (non-fatal):', err.message));