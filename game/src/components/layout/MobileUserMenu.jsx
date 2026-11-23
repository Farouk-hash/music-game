import { useEffect, useRef } from 'react';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { usePending } from '@/hooks/follows/useFollows.js';
import { ProfileAvatarSmall } from '../domain/Profile/ProfileChip.jsx';
import { usePendingInvites } from '@/hooks/invites/useInvites.js';
import { IconFriends, IconCollection } from '@/icons'; 

export function MobileUserMenu({
  open,
  onClose,
  onOpenProfile,
  onOpenFriends,
  onOpenCollections,
  disabled = false,
}) {
  const { profile } = useProfileContext();
  const { data: pending } = usePending();
  const hasIncoming = (pending?.incoming?.length ?? 0) > 0;
  const { data: inv } = usePendingInvites({ enabled: false });
  const hasInvites = (inv?.invites?.length ?? 0) > 0;
  const showDot = hasIncoming || hasInvites;

  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (!panelRef.current) return;
      const burger = panelRef.current.parentElement?.querySelector('button');
      if (burger && burger.contains(e.target)) return;
      if (panelRef.current.contains(e.target)) return;
      onClose();
    }
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('touchstart', onDocClick);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Account menu"
      className={`
        sm:hidden absolute top-full right-0 mt-2 z-50
        w-64 rounded-lg border border-border bg-surface shadow-2xl
        p-2 space-y-1 ${disabled ? 'pointer-events-none' : ''}
      `}
    >
      {/* Profile row */}
      <button
        type="button"
        role="menuitem"
        onClick={onOpenProfile}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-md
          hover:bg-surface-2 transition-colors text-left
          ${disabledClass}
        `}
      >
        {profile ? (
          <ProfileAvatarSmall profile={profile} size={32} />
        ) : (
          <div className="h-8 w-8 rounded-full bg-surface-2 animate-pulse shrink-0" />
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-ink-subtle">
            Profile
          </span>
          <span className="block text-sm font-medium text-ink truncate" dir="auto">
            {profile?.nickname ?? '—'}
          </span>
        </span>
      </button>

      {/* Collections row */}
      <button
        type="button"
        role="menuitem"
        onClick={onOpenCollections}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-md
          hover:bg-surface-2 transition-colors text-left
          ${disabledClass}
        `}
      >
        <span className="h-8 w-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0">
          <IconCollection className="w-4 h-4 text-ink-muted" />
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-ink">Collections</span>
        </span>
      </button>

      {/* Friends row */}
      <button
        type="button"
        role="menuitem"
        onClick={onOpenFriends}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-md
          hover:bg-surface-2 transition-colors text-left
          ${disabledClass}
        `}
      >
        <span className="h-8 w-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0">
          <IconFriends className="w-4 h-4 text-ink-muted" />
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-ink">Friends</span>
          {showDot && !disabled && (
            <span aria-label="Pending friend requests" className="w-2 h-2 rounded-full bg-accent shrink-0" />
          )}
        </span>
      </button>
    </div>
  );
}