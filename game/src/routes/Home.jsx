// game/src/routes/Home.jsx
import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/setup/useCatalog.js';
import { Hero } from '../components/layout/Hero.jsx';
import { StatGrid } from '../components/layout/StatGrid.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  IconGenres, IconArtists, IconTracks, IconClips,
  IconAlbums, IconLyrics, IconReversed, IconInstruments,
} from '../lib/icons.jsx';
export default function Home() {
  const { data, isLoading, error } = useCatalog();

  const stats = [
    {
      label: 'Genres',
      value: data?.counts?.genres,
      description: 'Browse by style.',
      icon: <IconGenres />,
    },
    {
      label: 'Artists',
      value: data?.counts?.artists,
      description: 'Voices to know.',
      icon: <IconArtists />,
    },
    {
      label: 'Tracks',
      value: data?.counts?.tracks,
      description: 'Songs in the pool.',
      icon: <IconTracks />,
    },
    {
      label: 'Clips',
      value: data?.counts?.clips,
      description: 'Audio ready to play.',
      icon: <IconClips />,
    },
    {
      label: 'Reversed',
      value: data?.counts?.reversedClips,
      description: 'Backwards renditions.',
      icon: <IconReversed />,
    },
    {
      label: 'Albums',
      value: data?.counts?.albums,
      description: 'Collections in the pool.',
      icon: <IconAlbums />,
    },
    {
      label: 'Lyrics',
      value: data?.counts?.lyrics,
      description: 'Songs with lyrics.',
      icon: <IconLyrics />,
    },
    {
      label: 'Instruments',
      value: data?.counts?.instruments,
      description: 'Non-Vocals Instruments Only.',
      icon: <IconInstruments />,
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="relative">
        <div
          aria-hidden
          className="
            pointer-events-none absolute -inset-x-6 -top-20 h-80 -z-10
            bg-[radial-gradient(ellipse_at_top,rgba(201,138,90,0.12),transparent_60%)]
          "
        />
        <Hero
          eyebrow="Name that track"
          title="Short clips. Quick guesses. One clear answer."
          subtitle="A listening game built from your own catalogue. Ten rounds, name the track and the artist, see how many you can get."
        />
      </div>

      {/* Stat cards */}
      <StatGrid stats={stats} isLoading={isLoading} />

      {error && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          <p className="text-wrong font-medium">Failed to load catalogue</p>
          <p className="text-ink-muted mt-1">{error.message}</p>
        </div>
      )}

      {/* Start CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
        <Link to="/setup">
          <Button size="lg" disabled={isLoading}>
            Start the game
          </Button>
        </Link>
        <p className="text-sm text-ink-muted">
          Choose your genres and artists on the next screen.
        </p>
      </div>
    </div>
  );
}