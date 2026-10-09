import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';

const tiles = [
  // ── Source ──────────────────────────────────────────────
  {
    to: '/genres',
    icon: '🎼',
    title: 'Genres',
    description: 'Browse matb3aa genres. Publish them to Cloudflare.',
    group: 'source',
  },
  {
    to: '/artists',
    icon: '🎤',
    title: 'All Artists',
    description: 'Browse matb3aa artists. Publish them to Cloudflare.',
    group: 'source',
  },
  // ── Published ───────────────────────────────────────────
  {
    to: '/published/genres',
    icon: '📀',
    title: 'Published Genres',
    description: 'Genres currently live in Cloudflare.',
    group: 'published',
  },
  {
    to: '/published/tracks',
    icon: '🎶',
    title: 'Published Tracks',
    description: 'Tracks currently live in Cloudflare.',
    group: 'published',
  },
  {
    to: '/published/artists',
    icon: '⭐',
    title: 'Published Artists',
    description: 'Artists currently live in Cloudflare.',
    group: 'published',
  },
   {
    to: '/published/upload',
    icon: '🤳',
    title: 'Local Uploads',
    description: 'Uploads will live in Cloudflare.',
    group: 'published',
  },
  {
    to: '/quran',
    icon: '📖',
    title: 'القرآن الكريم',
    description: 'Browse reciters and publish surah clips from mp3quran.net.',
    group: 'quran',
  },
];

export default function Home() {
 

  const source = tiles.filter(t => t.group === 'source');
  const published = tiles.filter(t => t.group === 'published');

  return (
    <div className="space-y-8">
     
      {/* Source */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Source · matb3aa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {source.map(tile => (
            <TileLink key={tile.to} tile={tile} />
          ))}
        </div>
      </section>

      {/* Published */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Published · Cloudflare
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {published.map(tile => (
            <TileLink key={tile.to} tile={tile} variant="published" />
          ))}
        </div>
      </section>

        
      {/* Quran */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Quran
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiles.filter(t => t.group === 'quran').map(tile => (
            <TileLink key={tile.to} tile={tile} variant="quran" />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Small helper — one tile, styled by group */
function TileLink({ tile, variant = 'source' }) {
  const isPublished = variant === 'published';

  return (
    <Link
      to={tile.to}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-lg"
    >
      <Card
        hover
        className={`h-full ${
          isPublished ? 'border-emerald-500/30' : ''
        }`}
      >
        <div className="p-8 flex flex-col items-center text-center gap-3">
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center text-3xl
              ${isPublished
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-brand-100 text-brand-500'}
            `}
          >
            <span aria-hidden="true">{tile.icon}</span>
          </div>
          <h2 className="text-xl font-semibold text-ink">{tile.title}</h2>
          <p className="text-sm text-ink-muted max-w-xs">{tile.description}</p>
        </div>
      </Card>
    </Link>
  );
}