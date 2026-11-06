// game/src/components/domain/Collections/editor/EditorBasics.jsx
import { useMemo, useEffect, useState } from 'react';
import { useProfileContext } from '../../../../context/ProfileContext.jsx';
import { useRemoveCover } from '../../../../hooks/collections/useCollections.js';
import { useToast } from '../../../../hooks/ui/useToast';
import { resizeImageToSquare } from '../../../../lib/imageResize.js';
import { CollectionCover } from '../primitives/CollectionCover.jsx';
import { Badge } from '../primitives/Badge.jsx';

const LEVEL_OPTIONS = [
  { value: 1, label: 'L1', hint: 'One question per clip' },
  { value: 2, label: 'L2', hint: 'Multiple per clip' },
  { value: 3, label: 'L3', hint: 'Set-based' },
];

export function EditorBasics({
  draft,
  setName,
  setCoverFile,
  setCover,
  toggleLevel,
  isExisting = false,
  collectionId = null,
  readOnly = false,
}) {
  const { show } = useToast();
  const { id: profileId } = useProfileContext();
  const removeCoverMutation = useRemoveCover(profileId);
  const [removing, setRemoving] = useState(false);

  // Blob preview URL — created fresh when draft.coverFile changes,
  // revoked on unmount / next pick to avoid leaks.
  const stagedPreviewUrl = useMemo(
    () => (draft.coverFile ? URL.createObjectURL(draft.coverFile) : null),
    [draft.coverFile]
  );

  useEffect(() => {
    return () => {
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
    };
  }, [stagedPreviewUrl]);

  // Preview precedence:
  //   1. staged file (new pick, not yet saved) → blob URL
  //   2. draft.cover (server-side existing cover, from initialCollection)
  //   3. gradient fallback (inside CollectionCover)
  const previewCollection = {
    name: draft.name,
    cover: stagedPreviewUrl
      ? { kind: 'uploaded', url: stagedPreviewUrl }
      : (draft.cover ?? { kind: 'generated', url: null }),
  };

  const hasExistingUploadedCover = draft.cover?.kind === 'uploaded';
  const hasStagedFile = !!draft.coverFile;

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageToSquare(file, 512, 0.8);
      setCoverFile(resized);
    } catch (err) {
      show({ message: `Could not process image: ${err.message}` });
    } finally {
      e.target.value = '';
    }
  }

  async function handleRemoveCover() {
    if (!collectionId || !profileId) return;
    setRemoving(true);
    try {
      const result = await removeCoverMutation.mutateAsync(collectionId);
      setCover(result.collection.cover);
      show({ message: 'Cover removed.' });
    } catch (err) {
      show({ message: `Remove failed: ${err.message}` });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className={`space-y-4 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
        Basics
      </h3>

      {/* Cover */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-muted">Cover</p>
        <div className="flex items-center gap-3 flex-wrap">
          <CollectionCover collection={previewCollection} size="md" />

          {!readOnly && (
            <label className="inline-flex items-center gap-2 px-4 h-9 rounded-md border text-sm cursor-pointer transition-colors border-border bg-surface-2 text-ink-muted hover:border-accent-2 hover:text-ink">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePick}
                className="hidden"
              />
              {hasStagedFile
                ? 'Change image'
                : hasExistingUploadedCover
                  ? 'Replace image'
                  : 'Choose image'}
            </label>
          )}

          {!readOnly && hasStagedFile && (
            <button
              type="button"
              onClick={() => setCoverFile(null)}
              className="text-sm text-ink-subtle hover:text-wrong transition-colors"
            >
              Discard
            </button>
          )}

          {!readOnly && !hasStagedFile && hasExistingUploadedCover && collectionId && (
            <button
              type="button"
              onClick={handleRemoveCover}
              disabled={removing}
              className="text-sm text-ink-subtle hover:text-wrong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {removing ? 'Removing…' : 'Remove cover'}
            </button>
          )}
        </div>

        {!readOnly && (
          <p className="text-[11px] text-ink-subtle">
            JPG, PNG, or WebP. Resized to 512×512.
            {hasStagedFile && !isExisting && <> Uploaded after you save.</>}
            {hasStagedFile && isExisting && <> Uploaded when you save.</>}
          </p>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="collection-name" className="block text-xs font-medium text-ink-muted">
          Name
        </label>
        {readOnly ? (
          <p className="text-sm text-ink py-2 min-h-[2.75rem]">{draft.name}</p>
        ) : (
          <>
            <input
              id="collection-name"
              type="text"
              value={draft.name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              placeholder="e.g. Arabic Pop 1997–2015"
              className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
            />
            <p className="text-[11px] text-ink-subtle">{draft.name.length}/64</p>
          </>
        )}
      </div>

      {/* Levels */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-muted">Levels</p>
        {!readOnly && (
          <p className="text-[11px] text-ink-subtle">
            Which levels this collection can be played at. Every round below
            must belong to one of these levels.
          </p>
        )}
        
        {readOnly ? (
          <div className="flex gap-2 py-2">
            {LEVEL_OPTIONS.filter(opt => draft.levels.has(opt.value)).map(opt => (
              <Badge key={opt.value} variant="accent">{opt.label}</Badge>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_OPTIONS.map((opt) => {
              const active = draft.levels.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleLevel(opt.value)}
                  aria-pressed={active}
                  className={[
                    'text-left p-3 rounded-md border transition-colors space-y-0.5',
                    active
                      ? 'bg-accent-soft border-accent text-ink'
                      : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-[11px]">{opt.hint}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}