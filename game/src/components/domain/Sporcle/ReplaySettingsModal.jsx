// game/src/components/domain/Sporcle/ReplaySettingsModal.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { Button } from '../../ui/Button.jsx';
import { SearchBar } from '../../ui/SearchBar.jsx';
import { Loader } from '../../ui/Loader.jsx';
import { GenreTileGrid } from '../Setup/Genres/GenreTileGrid.jsx';
import { ArtistTileGrid } from '../Setup/Artists/ArtistTileGrid.jsx';
import { YearTileGrid } from '../Setup/Years/YearTileGrid.jsx';
import { useCatalog } from '../../../hooks/setup/useCatalog.js';

const EMPTY_CONFIG = {};

function toggleInSet(setter, value) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

export function ReplaySettingsModal({
  open,
  onClose,
  initialMode = 'speed',
  initialCount = 10,
  initialConfig = EMPTY_CONFIG,
  onSubmit,
}) {
  const { data, isLoading } = useCatalog();

  const [mode, setMode] = useState(initialMode);
  const [count, setCount] = useState(initialCount);

  const [selectedGenres, setSelectedGenres] = useState(() => new Set(initialConfig.genres || []));
  const [selectedArtists, setSelectedArtists] = useState(() => new Set(initialConfig.artists || []));
  const [selectedYears, setSelectedYears] = useState(() => new Set(initialConfig.years || []));

  const [artistQuery, setArtistQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const genres = data?.genres ?? [];
  const artists = data?.artists ?? [];
  const years = data?.years ?? [];

  // Reset state only on the closed -> open transition (not on every render)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setMode(initialMode);
      setCount(initialCount);
      setSelectedGenres(new Set(initialConfig.genres || []));
      setSelectedArtists(new Set(initialConfig.artists || []));
      setSelectedYears(new Set(initialConfig.years || []));
      setArtistQuery('');
    }
    wasOpen.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleGenre = (id) => {
    toggleInSet(setSelectedGenres, id);
    setSelectedArtists(new Set());
    setSelectedYears(new Set());
  };
  const toggleArtist = (id) => toggleInSet(setSelectedArtists, id);
  const toggleYear = (year) => toggleInSet(setSelectedYears, year);

  const visibleArtists = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => (a.name ?? '').toLowerCase().includes(q));
  }, [artists, artistQuery]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);

    const config = {
      mode,
      count,
      genres: [...selectedGenres],
      artists: [...selectedArtists],
      years: [...selectedYears],
    };

    try {
      await onSubmit(config);
      onClose?.();
    } catch {
      // keep modal open so the user can retry
    } finally {
      setSubmitting(false);
    }
  }

  const pill = (active) =>
    `px-4 h-10 rounded-md border text-sm font-medium transition-colors ${
      active ? 'bg-accent text-bg border-accent' : 'bg-surface-2 text-ink-muted border-border'
    }`;

  return (
    <Modal open={open} onClose={onClose} size="xl">
      {/*
        dvh = dynamic viewport height (accounts for mobile browser bars).
        min-h-0 on the body is what allows flex children to actually scroll.
      */}
      <div className="rounded-lg border border-border bg-surface flex flex-col h-[85vh] h-[85dvh] max-h-[85dvh] overflow-hidden">
        <header className="flex items-start justify-between p-4 sm:p-6 border-b border-border shrink-0">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Play again</p>
            <h2 className="text-xl font-bold text-ink mt-1">New Game Settings</h2>
            <p className="text-sm text-ink-muted mt-1">Update the scope or game mode.</p>
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink text-sm" aria-label="Close">
            ✕
          </button>
        </header>

        {/* The ONLY scroll container in the modal */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {isLoading && <Loader variant="page" label="Loading catalog…" />}

          {!isLoading && (
            <>
              <section className="flex flex-wrap gap-6 border-b border-border pb-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Mode</label>
                  <div className="flex gap-2">
                    {['speed', 'collect'].map((m) => (
                      <button key={m} type="button" onClick={() => setMode(m)} className={pill(mode === m)}>
                        {m === 'speed' ? 'Speed' : 'Collect'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Questions</label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCount(n)}
                        className={`${pill(count === n)} tabular-nums`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-3 border-b border-border pb-4">
                <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Genres</h3>
                <div className="[&_.grid]:grid-cols-3 sm:[&_.grid]:grid-cols-4">
                  <GenreTileGrid
                    genres={genres}
                    selectedIds={selectedGenres}
                    onToggle={toggleGenre}
                    allSelected={false}
                    initialCount={12}
                  />
                </div>
              </section>

              <section className="space-y-3 border-b border-border pb-4">
                <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Artists</h3>
                <SearchBar value={artistQuery} onChange={setArtistQuery} placeholder="Filter artists…" />
                {visibleArtists.length > 0 && (
                  <div className="[&_.grid]:grid-cols-3 sm:[&_.grid]:grid-cols-4">
                    <ArtistTileGrid
                      artists={visibleArtists}
                      selectedIds={selectedArtists}
                      onToggle={toggleArtist}
                      resetKey={[...selectedGenres].join(',')}
                      initialCount={12}
                    />
                  </div>
                )}
              </section>

              <section className="space-y-3 pb-2">
                <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Years (Optional)</h3>
                <YearTileGrid
                  years={years}
                  selectedYears={selectedYears}
                  onToggle={toggleYear}
                  validArtistIds={selectedArtists}
                />
              </section>
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 p-4 border-t border-border bg-surface shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || selectedGenres.size === 0}
          >
            {submitting ? 'Starting…' : 'Start game →'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}