// game/src/components/domain/Collections/modal/CollectionModalShell.jsx
import { Modal } from '@/components/Modal/Modal.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { CollectionCover } from '../primitives/CollectionCover.jsx';
import { PlayerAvatar } from '@/components/Avatar/PlayerAvatar.jsx';
import { EditorBasics } from '../editors/EditorBasics.jsx';
import { EditorScope } from '../editors/EditorScope.jsx';
import { EditorRounds } from '../editors/EditorRounds.jsx';
import { Toggle } from '@/components/ui/Toggle.jsx';
import { FollowButton } from '../../Follow/FollowButton.jsx';
import { IconClose, IconCloud, IconPlay, IconUsers } from '@/icons';

export function CollectionModalShell({
  open,
  onClose,
  title,
  subtitle,
  collection,
  draft,
  mutations,
  readOnly = false,
  isClone = false,
  isPublic = false,
  setIsPublic,
  disabledTypes = new Set(),
  disabledReasons, // <-- Make sure it's here
  reversedClipsCount = 0,
  collectionId = null,
  isExisting = false,
  onPlay,
  onMultiplayer,
  onSave,
  saving = false,
  dirty = false,
  availableLevels = [],
}) {
  if (!open) return null;

  const author = collection?.author;
  const avatarProfile = author ? { id: author.profileId, nickname: author.nickname, avatar: author.avatar } : null;
  const noop = () => {};

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {collection && <CollectionCover collection={collection} size="lg" />}
            <div>
              <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                {subtitle || 'Collections'}
              </p>
              <h2 className="text-xl font-bold text-ink mt-1">{title}</h2>
              {author && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar avatar={avatarProfile} size={20} ring="ring-border" />
                    <span className="text-sm text-ink-muted">by {author.nickname}</span>
                  </div>
                  <FollowButton profileId={author.profileId} size="sm" />
                </div>
              )}
              {isClone && (
                <p className="text-sm text-wrong mt-1">
                  This is a shared collection. You cannot edit its rounds.
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-subtle hover:text-ink text-sm shrink-0" aria-label="Close">
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        <div className="space-y-8">
          {!readOnly && mutations && (
            <EditorBasics
              draft={draft}
              setName={mutations.setName}
              setCoverFile={mutations.setCoverFile}
              setCover={mutations.setCover}
              toggleLevel={mutations.toggleLevel}
              isExisting={isExisting}
              collectionId={collectionId}
            />
          )}

          <EditorScope
            draft={draft}
            toggleGenre={readOnly ? noop : mutations?.toggleGenre}
            toggleArtist={readOnly ? noop : mutations?.toggleArtist}
            toggleYear={readOnly ? noop : mutations?.toggleYear}
            readOnly={readOnly}
          />

          <EditorRounds
            draft={draft}
            disabledTypes={readOnly ? new Set() : disabledTypes}
            disabledReasons={readOnly ? new Map() : disabledReasons}
            reversedClipsCount={reversedClipsCount}
            addRound={readOnly ? noop : mutations?.addRound}
            removeRound={readOnly ? noop : mutations?.removeRound}
            updateRound={readOnly ? noop : mutations?.updateRound}
            moveRound={readOnly ? noop : mutations?.moveRound}
            readOnly={readOnly}
          />

          {!readOnly && !isClone && setIsPublic && (
            <div className="pt-4 border-t border-border">
              <Toggle
                checked={isPublic}
                onChange={setIsPublic}
                label="Publish to community"
                title="Allow other players to see and clone this collection"
              />
              <p className="text-[11px] text-ink-subtle mt-1">
                Published collections appear in the "Other collections" tab.
              </p>
            </div>
          )}
        </div>

        <footer className="pt-6 border-t border-border space-y-4">
          {!readOnly && (
            <div className="text-center sm:text-left">
              <span className="text-xs text-ink-subtle">
                {dirty ? 'Unsaved changes' : 'No changes to save'}
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 w-full">
            
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              className="flex-1"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            
            {onMultiplayer && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onMultiplayer(collection || { ...draft, id: collectionId || 'draft' })}
                disabled={availableLevels.length === 0}
                className="flex-1"
              >
                <IconUsers className="w-4 h-4 mr-2" />
                Multiplayer
              </Button>
            )}

            {onPlay && (
              <Button
                variant="primary"
                size="md"
                onClick={onPlay}
                disabled={availableLevels.length === 0}
                className="flex-1"
              >
                <IconPlay className="w-4 h-4 mr-2" />
                Play
              </Button>
            )}

            {!readOnly && onSave && (
              <Button
                variant="primary"
                size="md"
                onClick={onSave}
                disabled={saving || !dirty}
                className="flex-1"
              >
                {saving ? (
                  'Saving…'
                ) : (
                  <>
                    <IconCloud className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  );
}