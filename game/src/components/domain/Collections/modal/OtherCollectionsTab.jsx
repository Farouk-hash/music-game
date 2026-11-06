// game/src/components/domain/Collections/modal/OtherCollectionsTab.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useOtherCollections, useCloneCollection, useDeleteCollection } from '@/hooks/collections/useCollections.js';
import { CollectionTileGrid } from '../tiles/CollectionTileGrid.jsx';
import { useToast } from '@/hooks/ui/useToast';
import { Badge } from '../primitives/Badge.jsx';
import { CollectionReadOnlyModal } from './CollectionReadOnlyModal.jsx';

// Accept the onMultiplayer prop from CollectionsModal
export function OtherCollectionsTab({ onClose, onMultiplayer }) {
  const { show } = useToast();
  const navigate = useNavigate();
  const { id: profileId } = useProfileContext();
  const { data: others = [], isLoading, error } = useOtherCollections(profileId);
  
  const cloneMutation = useCloneCollection(profileId);
  const deleteMutation = useDeleteCollection(profileId);
  
  const [viewTarget, setViewTarget] = useState(null);

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

  function handleSeeAll() {
    onClose?.();
    navigate('/library/others');
  }

  function handleCloseForPlay() {
    setViewTarget(null);
    onClose?.();
  }

  if (isLoading) return <p className="text-sm text-ink-subtle text-center py-8">Loading…</p>;
  if (error) return <p className="text-sm text-wrong text-center py-8">{error.message}</p>;

  if (others.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-md">
        <p className="text-sm text-ink-muted">No public collections yet.</p>
        <p className="text-xs text-ink-subtle mt-1">
          When other players publish their games, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="accent" isMine={false}>Public</Badge>
        <p className="text-xs text-ink-subtle">Collections shared by other players.</p>
      </div>
      
      <CollectionTileGrid
        collections={others}
        view="list"
        isMine={false}
        onEdit={setViewTarget}
        onClone={handleClone}
        onDelete={handleUnclone}
        resetKey="collections-modal|others"
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

      <CollectionReadOnlyModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onPlay={handleCloseForPlay}
        onMultiplayer={onMultiplayer} 
        collection={viewTarget}
      />
    </div>
  );
}