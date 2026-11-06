// game/src/components/domain/Collections/LibraryPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CollapsibleSection } from '@/components/layout/CollapsibleSection.jsx';
import { ViewToggle } from '@/components/ui/ViewToggle.jsx';
import { SearchBar } from '@/components/ui/SearchBar.jsx';
import { CollectionTileGrid } from '@/components/domain/Collections/tiles/CollectionTileGrid.jsx';
import { CollectionEditorModal } from '@/components/domain/Collections/modal/CollectionEditorModal.jsx';
import { CollectionReadOnlyModal } from '@/components/domain/Collections/modal/CollectionReadOnlyModal.jsx';
import { CollectionMultiplayerModal } from '@/components/domain/Collections/modal/CollectionMultiplayerModal.jsx';
import { FilterPanel } from '@/components/domain/Collections/filters/FilterPanel.jsx';
import { WarningModal } from '@/components/Modal/WarningModal.jsx';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useCollections, useOtherCollections, useDeleteCollection, useCloneCollection } from '@/hooks/collections/useCollections.js';
import { useCollectionFilters } from '@/hooks/collections/useCollectionFilters.js';
import { useCollectionMultiplayer } from '@/hooks/collections/useCollectionMultiplayer.js';
import { useToast } from '@/hooks/ui/useToast.jsx';
import { IconPlus, IconCollection, IconClose } from '@/icons';
import { Loader } from '@/components/ui/Loader';
import { Reveal } from '@/components/ui/Reveal';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx'; 
import { useCatalog } from '@/hooks/setup/useCatalog';
import { Button } from '@/components/ui/Button';

export function LibraryPage({ mode = 'mine' }) {
  const isMine = mode === 'mine';
  const title = isMine ? 'Library' : 'Community';
  const subtitle = isMine 
    ? 'Save, edit and replay your favourite setups.' 
    : 'Discover and save public collections from other players.';
  const storageKey = isMine ? 'game.libraryView' : 'game.libraryOthersView';

  const { show } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { id: profileId } = useProfileContext();

   const { data: catalog } = useCatalog(); 
  const reversedClipsCount = catalog?.counts?.reversedClips ?? 0; 

  const collectionsQuery = useCollections(profileId);
  const othersQuery = useOtherCollections(profileId);
  const { data: rawCollections = [], isLoading, error } = isMine ? collectionsQuery : othersQuery;

  const deleteMutation = useDeleteCollection(profileId);
  const cloneMutation = useCloneCollection(profileId);

  // Multiplayer state machine lives in the hook — reused across pages
  const mp = useCollectionMultiplayer();

  // --- Filter & Search State ---
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    genres: new Set(), artists: new Set(), questionTypes: new Set(),
    levels: new Set(), modes: new Set(), instruments: new Set(),
    friends: new Set(),
  });

  const handleToggleFilter = useCallback((group, value) => {
    setActiveFilters((prev) => {
      const next = new Set(prev[group]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [group]: next };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({
      genres: new Set(), artists: new Set(), questionTypes: new Set(),
      levels: new Set(), modes: new Set(), instruments: new Set(),
      friends: new Set(),
    });
    setQuery('');
  }, []);

  const { filtered, facets } = useCollectionFilters(rawCollections, { query, activeFilters });

  // --- UI State ---
  const [view, setView] = useState(() => {
    const v = localStorage.getItem(storageKey);
    return v === 'list' || v === 'dense' ? v : 'grid';
  });
  const changeView = useCallback((v) => {
    setView(v);
    localStorage.setItem(storageKey, v);
  }, [storageKey]);

  const [isOpen, setIsOpen] = useState(true);
  
  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [readOnlyTarget, setReadOnlyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isPlayingRef = useRef(false);

  // Deep link logic
  useEffect(() => {
    if (isPlayingRef.current) return;
    if (!isMine || !id || isLoading || error) return;

    const match = rawCollections.find((c) => String(c.id) === String(id));
    if (match) {
      if (match.profileId !== profileId) setReadOnlyTarget(match);
      else { setEditingCollection(match); setEditorOpen(true); }
    } else if (rawCollections.length > 0) {
      navigate('/library', { replace: true });
    }
  }, [id, isLoading, rawCollections.length, profileId, isMine]);

  useEffect(() => {
    if (!id) {
      isPlayingRef.current = false;
    }
  }, [id]);

  function handleCreate() { setEditingCollection(null); setEditorOpen(true); }

  function handleEdit(collection) {
    if (collection.profileId !== profileId) {
      setReadOnlyTarget(collection);
      if (isMine) navigate(`/library/${collection.id}`);
    } else {
      setEditingCollection(collection);
      setEditorOpen(true);
      if (isMine) navigate(`/library/${collection.id}`);
    }
  }

  async function handleClone(collection) {
    try {
      await cloneMutation.mutateAsync({ sourceId: collection.id });
      show({ message: `Saved "${collection.name}" to your collections.` });
    } catch (e) {
      show({ message: `Could not save: ${e.message}` });
    }
  }

  async function handleUnclone(collection) {
    try {
      await deleteMutation.mutateAsync(collection.id);
      show({ message: `Removed "${collection.name}" from your collections.` });
    } catch (e) {
      show({ message: `Could not remove: ${e.message}` });
    }
  }

  function handleCloseEditor() {
    setEditorOpen(false); setEditingCollection(null);
    if (isMine && id) navigate('/library', { replace: true });
  }

  function handleCloseReadOnly() {
    setReadOnlyTarget(null);
    if (isMine && id) navigate('/library', { replace: true });
  }

  function handlePlayFromEditor() {
    isPlayingRef.current = true;
    handleCloseEditor();
  }

  function handlePlayFromReadOnly() {
    isPlayingRef.current = true;
    handleCloseReadOnly();
  }

  // Delegates to the hook — closes read-only, opens the multiplayer modal
  function handleMultiplayerFromReadOnly(collection) {
    mp.openMultiplayerFor(collection, {
      onCloseReadOnly: () => setReadOnlyTarget(null),
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(target.id);
      show({ message: `Deleted "${target.name}".` });
      if (isMine && id === String(target.id)) navigate('/library', { replace: true });
    } catch (e) {
      show({ message: `Delete failed: ${e.message}` });
    }
  }

  const empty = !isLoading && !error && rawCollections.length === 0;
  const noResults = !isLoading && !error && rawCollections.length > 0 && filtered.length === 0;

  return (
    <BorderContainer border="all" padding="lg" className="space-y-8 pb-32">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-tight">{title}</h1>
          <p className="text-ink-muted max-w-xl mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isMine ? (
           <Button
            variant="primary"
            size="md"
            onClick={handleCreate}
            className="h-9 px-3"
          >
            <IconPlus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline ml-1.5">New</span>
          </Button>
          ) : (
            <Link to="/library" className="text-sm text-ink-muted hover:text-ink transition-colors">
              ← Back to my collections
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={query} onChange={setQuery} placeholder="Search collections…" />
        </div>
        <ViewToggle value={view} onChange={changeView} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-64 shrink-0">
          <div className="rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-6">
            <FilterPanel facets={facets} activeFilters={activeFilters} onToggle={handleToggleFilter} onClear={handleClearFilters} />
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <CollapsibleSection
            open={isOpen}
            onToggle={() => setIsOpen((o) => !o)}
            title={isMine ? "Collections" : "Public collections"}
            icon={<IconCollection className="w-5 h-5" />}
            meta={filtered.length > 0 ? `(${filtered.length})` : null}
          >
            {isLoading && (<Loader variant="page" label="Loading collections..." />)}
            {error && <div className="rounded-md border border-wrong bg-wrong-soft p-3"><p className="text-sm text-wrong">Failed to load: {error.message}</p></div>}

            {empty && (
              <div className="text-center py-16 border border-dashed border-border rounded-md">
                <p className="text-sm text-ink-muted">No collections found.</p>
              </div>
            )}

            {noResults && (
              <div className="text-center py-16 border border-dashed border-border rounded-md">
                <p className="text-sm text-ink-muted">No collections match your filters.</p>
                <button type="button" onClick={handleClearFilters} className="text-xs text-accent hover:text-accent-2 mt-2 transition-colors">Clear filters</button>
              </div>
            )}

            { !error && filtered.length > 0 && (
              <Reveal direction="up" distance={100}>
                <CollectionTileGrid
                  collections={filtered}
                  view={view}
                  isMine={isMine}
                  onEdit={handleEdit}
                  isLoading={isLoading}
                  onDelete={isMine ? (c) => setDeleteTarget(c) : handleUnclone}
                  onClone={handleClone}
                  resetKey={isMine ? "library" : "library-others"}
                />
              </Reveal>
            )}
          </CollapsibleSection>
        </div>
      </div>

      <CollectionEditorModal 
        open={editorOpen} 
        onClose={handleCloseEditor} 
        onPlay={handlePlayFromEditor}
        onMultiplayer={handleMultiplayerFromReadOnly}
        initialCollection={editingCollection} 
      />
      
      <CollectionReadOnlyModal 
        open={!!readOnlyTarget} 
        onClose={handleCloseReadOnly} 
        onPlay={handlePlayFromReadOnly}
        onMultiplayer={handleMultiplayerFromReadOnly}
        collection={readOnlyTarget} 
      />
      
      <WarningModal
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete}
        title="Delete collection?" description={deleteTarget ? `"${deleteTarget.name}" will be permanently removed.` : ''}
        confirmLabel="Delete" cancelLabel="Cancel" showCancel
      />

      <CollectionMultiplayerModal
        collection={mp.multiplayerCollection}
        onClose={mp.closeMultiplayer}
        onStart={mp.startMultiplayer}
        disabledTypes={new Set()}
        reversedClipsCount={reversedClipsCount}
      />
    </BorderContainer>
  );
}