// game/src/components/domain/Collections/modal/CreateCollectionTab.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useCreateCollection } from '@/hooks/collections/useCollections.js';
import { useCollectionDraft, draftToBody } from '@/hooks/collections/useCollectionDraft.js';
import { useToast } from '@/hooks/ui/useToast';
import { CollectionEditor } from '../editors/CollectionEditor.jsx';
import { Toggle } from '@/components/ui/Toggle.jsx'; // adjust path if needed

export function CreateCollectionTab({ onClose }) {
  const { show } = useToast();
  const navigate = useNavigate();
  const { id: profileId } = useProfileContext();
  const createMutation = useCreateCollection(profileId);

  const mutations = useCollectionDraft();
  const { draft } = mutations;
  
  // New: State for the publish toggle
  const [isPublic, setIsPublic] = useState(false);

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
      const result = await createMutation.mutateAsync({
        body: { ...draftToBody(d), isPublic },
        file: d.coverFile ?? null,
      });

      const newId = result.collection.id;

      if (result.coverError) {
        show({
          message: `Created "${d.name}". Cover failed to upload: ${result.coverError}. You can retry from Edit.`,
          durationMs: 8000,
        });
      } else {
        show({ message: `Created "${d.name}".` });
      }

      onClose();
      navigate(`/library/${newId}`);
    } catch (e) {
      show({ message: `Save failed: ${e.message}` });
    }
  }

  return (
    <div className="space-y-6">
      
      <CollectionEditor
        draft={draft}
        mutations={mutations}
        initialSignature={null}
        disabledTypes={new Set()}
        reversedClipsCount={0}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        onCancel={onClose}
        onSave={handleSave}

        saving={createMutation.isPending}
        isExisting={false}
      />

      
    </div>
  );
}