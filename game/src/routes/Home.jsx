// game/src/routes/Home.jsx
import { Link } from 'react-router-dom';
import { useCatalog } from '@/hooks/setup/useCatalog.js';
import { Hero } from '@/components/layout/Hero.jsx';
import { Button } from '@/components/ui/Button.jsx';
import {
  IconGenres, IconArtists, IconTracks, IconClips,
  IconAlbums, IconLyrics, IconReversed, IconInstruments,
} from '@/icons';

export default function Home() {
  const { data, isLoading, error } = useCatalog();

  const stats = [
    { label: 'Genres', value: data?.counts?.genres, description: 'Browse by style.', icon: <IconGenres /> },
    { label: 'Artists', value: data?.counts?.artists, description: 'Voices to know.', icon: <IconArtists /> },
    { label: 'Tracks', value: data?.counts?.tracks, description: 'Songs in the pool.', icon: <IconTracks /> },
    { label: 'Clips', value: data?.counts?.clips, description: 'Audio ready to play.', icon: <IconClips /> },
    { label: 'Reversed', value: data?.counts?.reversedClips, description: 'Backwards renditions.', icon: <IconReversed /> },
    { label: 'Albums', value: data?.counts?.albums, description: 'Collections in the pool.', icon: <IconAlbums /> },
    { label: 'Lyrics', value: data?.counts?.lyrics, description: 'Songs with lyrics.', icon: <IconLyrics /> },
    { label: 'Instruments', value: data?.counts?.instruments, description: 'Non-Vocals Instruments Only.', icon: <IconInstruments /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-32">
      
      {/* Hero with integrated OrbitArt, Stats, and ImageCarousel */}
      <div className="relative">
        <div
          aria-hidden
          className="
            pointer-events-none absolute -inset-x-6 -top-20 h-80 -z-10
          "
        />
        <Hero
          eyebrow="Name that track"
          title="How well do you know your music?"
          subtitle="A listening game built from your own catalogue. Just name that tune."
          stats={stats}
          isLoading={isLoading}
        />
      </div>

      {error && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          <p className="text-wrong font-medium">Failed to load catalogue</p>
          <p className="text-ink-muted mt-1">{error.message}</p>
        </div>
      )}

    </div>
  );
}