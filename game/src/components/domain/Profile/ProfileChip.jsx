import { useState } from 'react';
import { useProfileContext } from '../../../context/ProfileContext.jsx';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { absoluteAvatarUrl } from '../../../lib/profileApi.js';

export function ProfileChip({ bare = false, onClick, disabled }) {
  const { profile, isLoading } = useProfileContext();
  const [modalOpen, setModalOpen] = useState(false);

  // ✅ Only open modal if not disabled and no external onClick is provided
  const handleOpen = () => {
    if (disabled) return;
    if (onClick) onClick();
    else setModalOpen(true);
  };

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
      onClick={handleOpen} // ✅ Use the safe handler
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 h-10 rounded-md
        border border-border bg-surface-2
        text-sm text-ink-muted
        transition-colors
        ${disabled 
          ? 'opacity-50 cursor-not-allowed pointer-events-none' 
          : 'hover:border-accent-2 hover:text-ink'}
      `}
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