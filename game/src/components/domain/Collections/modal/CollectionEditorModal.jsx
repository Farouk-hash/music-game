// game/src/components/domain/Collections/editor/CollectionEditorModal.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useCreateCollection, useSaveCollection } from '@/hooks/collections/useCollections.js';
import { useCollectionDraft, draftFromCollection, draftToBody } from '@/hooks/collections/useCollectionDraft.js';
import { useToast } from '@/hooks/ui/useToast';
import { CollectionEditor } from '../editors/CollectionEditor.jsx';

export function CollectionEditorModal({ 
  open, 
  onClose, 
  initialCollection = null, 
  onPlay,
  onMultiplayer,
  reversedClipsCount = 0 
}) {
  if (!open) return null;

  const { show } = useToast();
  const navigate = useNavigate();
  const { id: profileId } = useProfileContext();

  const isEditing = !!initialCollection;
  const isClone = isEditing && initialCollection.sourceId != null;

  const createMutation = useCreateCollection(profileId);
  const saveMutation = useSaveCollection(profileId);
  const mutation = isEditing ? saveMutation : createMutation;

  const initialDraft = initialCollection ? draftFromCollection(initialCollection) : undefined;
  const mutations = useCollectionDraft(initialDraft);
  const { draft } = mutations;

  const [isPublic, setIsPublic] = useState(initialCollection?.isPublic ?? false);

  async function handleSave(d, errors) {
    if (errors && errors.length > 0) {
      show({ message: errors[0] });
      return;
    }
    if (!profileId) {
      show({ message: 'Profile not ready — try again in a moment.' });
      return;
    }

    try {
      const payload = {
        body: { ...draftToBody(d), isPublic },
        file: d.coverFile ?? null,
      };

      let result;
      if (isEditing) {
        result = await saveMutation.mutateAsync({ id: initialCollection.id, ...payload });
      } else {
        result = await createMutation.mutateAsync(payload);
      }

      if (result.coverError) {
        show({
          message: `${isEditing ? 'Saved' : 'Created'} "${d.name}". Cover failed: ${result.coverError}.`,
          durationMs: 8000,
        });
      } else {
        show({ message: `${isEditing ? 'Saved' : 'Created'} "${d.name}".` });
      }

      if (isEditing) {
        onClose();
      } else {
        onClose();
        navigate(`/library/${result.collection.id}`);
      }
    } catch (e) {
      show({ message: `Save failed: ${e.message}` });
    }
  }

  return (
    <CollectionEditor
      draft={draft}
      mutations={mutations}
      initialSignature={null}
      disabledTypes={new Set()}
      reversedClipsCount={reversedClipsCount} 
      isPublic={isPublic}
      setIsPublic={setIsPublic}
      onCancel={onClose}
      onSave={handleSave}
      saving={mutation.isPending}
      isExisting={isEditing}
      collectionId={initialCollection?.id ?? null}
      onPlay={onPlay} 
      onMultiplayer={onMultiplayer}
    />
  );
}