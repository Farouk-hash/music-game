// game/src/components/domain/Profile/ProfileChip.jsx
import { useState } from 'react';
import { useProfileContext } from '../../../context/ProfileContext.jsx';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { absoluteAvatarUrl } from '../../../lib/profileApi.js';

/**
 * Header chip. Shows the current avatar + nickname.
 * Clicking opens the profile modal.
 *
 * Props:
 *   bare — if true, renders the chip content only (no modal, no click
 *          handler). Use inside a mobile menu row where the parent
 *          owns the modal. Default false: standalone with its own modal.
 */
export function ProfileChip({ bare = false, onClick }) {
  const { profile, isLoading } = useProfileContext();
  const [modalOpen, setModalOpen] = useState(false);

  const open = onClick ?? (() => setModalOpen(true));

  // Placeholder while the profile loads for the first time.
  if (isLoading || !profile) {
    return (
      <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-border bg-surface-2">
        <div className="h-7 w-7 rounded-full bg-surface animate-pulse" />
        <div className="h-3 w-16 rounded bg-surface animate-pulse" />
      </div>
    );
  }

  const chip = (
    <button
      type="button"
      onClick={open}
      className="
        flex items-center gap-2 px-3 h-10 rounded-md
        border border-border bg-surface-2
        text-sm text-ink-muted
        hover:border-accent-2 hover:text-ink
        transition-colors
      "
      aria-label="Open profile"
    >
      <ProfileAvatarSmall profile={profile} size={28} />
      <span className="max-w-[10rem] truncate hidden sm:inline">
        {profile.nickname}
      </span>
    </button>
  );

  if (bare) return chip;

  return (
    <>
      {chip}
      <ProfileModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/**
 * Renders the profile's avatar in the chip.
 * Uses uploaded image if present, otherwise DiceBear.
 *
 * Exported so the mobile menu can reuse the exact same avatar logic.
 */
export function ProfileAvatarSmall({ profile, size = 28 }) {
  const uploadedUrl = absoluteAvatarUrl(profile);

  if (uploadedUrl) {
    return (
      <img
        src={uploadedUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full shrink-0 ring-1 ring-border bg-surface-2"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <PlayerAvatar
      seed={profile.avatar?.seed ?? profile.nickname}
      style={profile.avatar?.style ?? undefined}
      size={size}
    />
  );
}