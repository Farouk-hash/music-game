// game/src/components/domain/Collections/modal/CollectionsModal.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/Modal/Modal.jsx';
import { TabStrip } from '@/components/ui/TabStrip.jsx';
import { CollectionTileGrid } from '../tiles/CollectionTileGrid.jsx';
import { CollectionEditorModal } from './CollectionEditorModal.jsx';
import { CollectionReadOnlyModal } from './CollectionReadOnlyModal.jsx';
import { CollectionMultiplayerModal } from './CollectionMultiplayerModal.jsx'; // <-- ADD THIS
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useCollections, useDeleteCollection } from '@/hooks/collections/useCollections.js';
import { useCollectionMultiplayer } from '@/hooks/collections/useCollectionMultiplayer.js'; // <-- ADD THIS
import { WarningModal } from '@/components/Modal/WarningModal.jsx';
import { useToast } from '@/hooks/ui/useToast';
import { CreateCollectionTab } from './CreateCollectionTab.jsx';
import { OtherCollectionsTab } from './OtherCollectionsTab.jsx';
import { IconClose } from '@/icons';
import { Badge } from '../primitives/Badge.jsx';
import { useCatalog } from '@/hooks/setup/useCatalog.js';

export function CollectionsModal({ open, onClose }) {
  const navigate = useNavigate();
  const { show } = useToast();
  const { id: profileId } = useProfileContext();
  const { data: collections = [], isLoading, error } = useCollections(profileId);
  const deleteMutation = useDeleteCollection(profileId);
  
  // --- ADD THE MULTIPLAYER HOOK ---
  const mp = useCollectionMultiplayer();
   const { data: catalog } = useCatalog(); 
  const reversedClipsCount = catalog?.counts?.reversedClips ?? 0;
  const [tab, setTab] = useState('mine');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [readOnlyTarget, setReadOnlyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (open) setTab('mine');
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEditorOpen(false);
      setEditingCollection(null);
      setReadOnlyTarget(null);
      setDeleteTarget(null);
      mp.closeMultiplayer(); // <-- Reset multiplayer on close
    }
  }, [open]);

  const tabs = [
    { key: 'mine',   label: 'My collections', badge: collections.length },
    { key: 'create', label: 'Create' },
    { key: 'others', label: 'Other collections' },
  ];

  function handleOpenCollection(c) {
    const isClone = c.profileId !== profileId;
    if (isClone) {
      setReadOnlyTarget(c);
      return;
    }
    setEditingCollection(c);
    setEditorOpen(true);
  }

  function handleCloseEditor() {
    setEditorOpen(false);
    setEditingCollection(null);
  }

  function handleDeleteRequest(c) {
    setDeleteTarget(c);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(target.id);
      show({ message: `Deleted "${target.name}".` });
      if (editorOpen && editingCollection?.id === target.id) {
        setEditorOpen(false);
        setEditingCollection(null);
      }
    } catch (e) {
      show({ message: `Delete failed: ${e.message}` });
    }
  }

  function handleSeeAll() {
    onClose();
    navigate('/library');
  }

  function handleCloseForPlay() {
    setEditorOpen(false);
    setEditingCollection(null);
    setReadOnlyTarget(null);
    onClose();
  }

  // --- NEW: Multiplayer Handler ---
  function handleMultiplayerFromReadOnly(collection) {
    mp.openMultiplayerFor(collection, {
      onCloseReadOnly: () => setReadOnlyTarget(null),
    });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg">
        <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Collections
              </p>
              <h2 className="text-xl font-bold text-ink mt-1">Your saved games</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-ink-subtle hover:text-ink text-sm shrink-0"
              aria-label="Close"
            ><IconClose /></button>
          </header>

          <TabStrip tabs={tabs} value={tab} onChange={setTab} cols={3} mode="grid" />

          {tab === 'mine' && (
            <div className="space-y-4">
              {isLoading && (
                <p className="text-sm text-ink-subtle text-center py-8">Loading collections…</p>
              )}
              {error && (
                <div className="rounded-md border border-wrong bg-wrong-soft p-3">
                  <p className="text-sm text-wrong">Failed to load: {error.message}</p>
                </div>
              )}
              {!isLoading && !error && collections.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-md">
                  <p className="text-sm text-ink-muted">No collections yet.</p>
                  <p className="text-xs text-ink-subtle mt-1">
                    Head to the Create tab to build your first one.
                  </p>
                </div>
              )}
              {!isLoading && !error && collections.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" isMine={true}>Mine</Badge>
                    <p className="text-xs text-ink-subtle">Your saved games.</p>
                  </div>
                  <CollectionTileGrid
                    collections={collections}
                    view="list"
                    isMine={true}
                    onEdit={handleOpenCollection}
                    onDelete={handleDeleteRequest}
                    resetKey="collections-modal|mine"
                  />
                  <div className="flex justify-end pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={handleSeeAll}
                      className="text-sm text-accent hover:text-accent-2 transition-colors"
                    >
                      See all →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {tab === 'create' && <CreateCollectionTab onClose={onClose} />}
          
          {/* Pass the multiplayer handler into OtherCollectionsTab */}
          {tab === 'others' && (
            <OtherCollectionsTab  
              onClose={onClose} 
              onMultiplayer={handleMultiplayerFromReadOnly} 
            />
          )}
        </div>
      </Modal>

      <CollectionEditorModal
        open={editorOpen}
        onClose={handleCloseEditor}
        onPlay={handleCloseForPlay}
        initialCollection={editingCollection}
        onMultiplayer={handleMultiplayerFromReadOnly}
        reversedClipsCount={reversedClipsCount}
      />

      <CollectionReadOnlyModal
        open={!!readOnlyTarget}
        onClose={() => setReadOnlyTarget(null)}
        onPlay={handleCloseForPlay}
        onMultiplayer={handleMultiplayerFromReadOnly} 
        collection={readOnlyTarget}
      />

      {/* RENDER THE MULTIPLAYER MODAL HERE */}
      <CollectionMultiplayerModal
        collection={mp.multiplayerCollection}
        onClose={mp.closeMultiplayer}
        onStart={mp.startMultiplayer}
        disabledTypes={new Set()}
        reversedClipsCount={reversedClipsCount} 
      />

      <WarningModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete collection?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        showCancel
      />
    </>
  );
}