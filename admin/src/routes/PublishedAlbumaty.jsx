// admin/src/routes/PublishedAlbumaty.jsx
import { useMemo, useState } from 'react';
import { useAlbumatySingers, useCrawlArtist } from '../hooks/cloud-flare/Albumaty/useAlbumaty';
import {
  useStartAlbumatyPublish,
  useAlbumatyPublishJob,
  useCancelAlbumatyPublish,
} from '../hooks/cloud-flare/Albumaty/useAlbumatyMutations';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { useCloudflareGenres } from '../hooks/cloud-flare/useCloudflareGenres';
import { AlbumatyArtistSearch } from '../components/domain/Albumaty/AlbumatyArtistSearch';
import { AlbumatyCartRow } from '../components/domain/Albumaty/AlbumatyCartRow';
import { AlbumatyPublishJobPanel } from '../components/domain/Albumaty/AlbumatyPublishJobPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { BackLink } from '../components/layout/BackLink';

const CRAWL_BATCH_SIZE = 3;
const DEFAULT_GENRE_IDS = [45];

export default function PublishedAlbumaty() {
  /* ── Singers list (all albumaty artists) ──────────── */
  const { data: singersData, isLoading: singersLoading, error: singersError } =
    useAlbumatySingers();
  const singers = singersData?.singers ?? [];

  /* ── All published artists (any source) ───────────── */
  const { artists: publishedArtists } = useCloudflareArtists({});

  const publishedNames = useMemo(
    () => new Set(
      publishedArtists
        .map(a => (a.name ?? '').trim())
        .filter(Boolean)
    ),
    [publishedArtists]
  );

  /* ── Genres list ──────────────────────────────── */
  const { genres } = useCloudflareGenres();

  /* ── Crawl mutation ───────────────────────────── */
  const crawlMutation = useCrawlArtist();

  /* ── Publish job state ────────────────────────── */
  const startPublish = useStartAlbumatyPublish();
  const cancelPublish = useCancelAlbumatyPublish();
  const [activeJobId, setActiveJobId] = useState(null);
  const { data: activeJob } = useAlbumatyPublishJob(activeJobId);
  const isJobActive =
    activeJob && (activeJob.status === 'running' || activeJob.status === 'starting');

  /* ── Cart state ───────────────────────────────── */
  const [cart, setCart] = useState([]);
  const [crawling, setCrawling] = useState(new Set());

  const alreadyAdded = useMemo(
    () => new Set(cart.map(c => c.albumatyId)),
    [cart]
  );

  function addToCart(singer) {
    if (alreadyAdded.has(singer.id)) return;
    setCart(prev => [
      ...prev,
      {
        albumatyId: singer.id,
        name: singer.name,
        image: null,
        genre_ids: DEFAULT_GENRE_IDS,
        crawlStatus: 'idle',
        crawlError: null,
        albums: [],
        singles: [],
      },
    ]);
  }

  function removeFromCart(albumatyId) {
    setCart(prev => prev.filter(c => c.albumatyId !== albumatyId));
  }

  function updateCartRow(albumatyId, patchOrFull) {
    setCart(prev =>
      prev.map(c => {
        if (c.albumatyId !== albumatyId) return c;
        return typeof patchOrFull === 'function'
          ? patchOrFull(c)
          : { ...c, ...patchOrFull };
      })
    );
  }

  async function crawlOne(albumatyId) {
    if (crawling.has(albumatyId)) return;

    setCrawling(prev => new Set(prev).add(albumatyId));
    updateCartRow(albumatyId, { crawlStatus: 'crawling', crawlError: null });

    try {
      const data = await crawlMutation.mutateAsync(albumatyId);

      const albums = (data.albums ?? []).map(a => ({
        ...a,
        songs: (a.songs ?? []).map(s => ({ ...s, selected: false })),
      }));
      const singles = (data.singles ?? []).map(s => ({ ...s, selected: false }));

      updateCartRow(albumatyId, {
        name: data.name ?? albumatyId,
        image: data.image ?? null,
        crawlStatus: 'crawled',
        crawlError: null,
        albums,
        singles,
      });
    } catch (e) {
      updateCartRow(albumatyId, {
        crawlStatus: 'error',
        crawlError: e.message,
      });
    } finally {
      setCrawling(prev => {
        const next = new Set(prev);
        next.delete(albumatyId);
        return next;
      });
    }
  }

  async function crawlAllPending() {
    const pending = cart.filter(
      c => c.crawlStatus === 'idle' || c.crawlStatus === 'error'
    );
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += CRAWL_BATCH_SIZE) {
      const batch = pending.slice(i, i + CRAWL_BATCH_SIZE);
      await Promise.all(batch.map(p => crawlOne(p.albumatyId)));
    }
  }

  const publishableArtists = useMemo(() => {
    return cart
      .map(c => {
        const selected = [
          ...c.albums.flatMap(a =>
            a.songs
              .filter(s => s.selected)
              .map(s => ({
                albumatySongId: s.id,
                name: s.name,
                album_name: a.name ?? null,
              }))
          ),
          ...c.singles
            .filter(s => s.selected)
            .map(s => ({
              albumatySongId: s.id,
              name: s.name,
              album_name: null,
            })),
        ];

        if (selected.length === 0) return null;
        return {
          albumatyId: c.albumatyId,
          name: c.name,
          image: c.image,
          genre_ids: c.genre_ids ?? DEFAULT_GENRE_IDS,
          tracks: selected,
        };
      })
      .filter(Boolean);
  }, [cart]);

  const publishableTracks = publishableArtists.reduce(
    (n, a) => n + a.tracks.length,
    0
  );

  async function handlePublish() {
    if (publishableArtists.length === 0) return;
    try {
      const res = await startPublish.mutateAsync(publishableArtists);
      setActiveJobId(res.job.id);
    } catch (e) {
      console.error('[albumaty publish]', e);
    }
  }

  function handleCancelJob(id) {
    cancelPublish.mutate(id);
  }

  if (singersLoading && singers.length === 0) {
    return <LoadingBlock label="Loading albumaty singers…" />;
  }

  if (singersError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load singers"
        description={singersError.message}
      />
    );
  }

  const cartTotal = cart.length;
  const crawledCount = cart.filter(c => c.crawlStatus === 'crawled').length;

  return (
    <div className="space-y-6 pb-32">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Albumaty</h1>
            <p className="text-sm text-ink-muted mt-1">
              Search albumaty singers, add them to the cart, crawl their albums
              and singles, then publish the tracks you want.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cartTotal > 0 && (
              <Badge variant="success">
                {cartTotal} in cart · {crawledCount} crawled
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Search
          </h2>
          <AlbumatyArtistSearch
            singers={singers}
            onAdd={addToCart}
            alreadyAdded={alreadyAdded}
            publishedNames={publishedNames}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Cart ({cartTotal})
            </h2>
            <div className="flex items-center gap-2">
              {cart.some(
                c => c.crawlStatus === 'idle' || c.crawlStatus === 'error'
              ) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={crawlAllPending}
                  disabled={isJobActive || crawling.size > 0}
                >
                  {crawling.size > 0 ? `Crawling ${crawling.size}…` : 'Crawl all'}
                </Button>
              )}
              {cart.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCart([])}
                  disabled={isJobActive}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {cartTotal === 0 && (
            <div className="rounded-lg border border-dashed border-surface-border p-8 text-center">
              <p className="text-sm text-ink-subtle">
                Cart is empty. Search for an artist on the left and add them.
              </p>
            </div>
          )}

          {cartTotal > 0 && (
            <div className="space-y-2">
              {cart.map(item => (
                <AlbumatyCartRow
                  key={item.albumatyId}
                  item={item}
                  genres={genres}
                  onCrawl={crawlOne}
                  onRemove={removeFromCart}
                  onUpdate={updateCartRow}
                  isPublished={publishedNames.has((item.name ?? '').trim())}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {cartTotal > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface-muted p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink">
              {publishableTracks > 0
                ? `${publishableTracks} track${publishableTracks === 1 ? '' : 's'} selected across ${publishableArtists.length} artist${publishableArtists.length === 1 ? '' : 's'}`
                : 'No tracks selected yet'}
            </p>
            <p className="text-xs text-ink-subtle mt-0.5">
              Each track publishes 2 clips: start (first 10s) + middle (10s).
            </p>
          </div>
          <Button
            variant="primary"
            disabled={publishableTracks === 0 || isJobActive}
            loading={startPublish.isPending}
            onClick={handlePublish}
          >
            {startPublish.isPending
              ? 'Starting…'
              : `Publish ${publishableTracks} track${publishableTracks === 1 ? '' : 's'}`}
          </Button>
        </div>
      )}

      {activeJob && (
        <AlbumatyPublishJobPanel
          job={activeJob}
          onCancel={handleCancelJob}
          cancelling={cancelPublish.isPending}
        />
      )}
    </div>
  );
}