// game/src/components/layout/MobileUserMenu.jsx
import { useEffect, useRef } from 'react';
import { useProfileContext } from '../../context/ProfileContext.jsx';
import { usePending } from '../../hooks/follows/useFollows.js';
import { ProfileAvatarSmall } from '../domain/Profile/ProfileChip.jsx';
import { usePendingInvites } from '../../hooks/invites/useInvites.js';

/**
 * Dropdown menu anchored to the header burger on small screens.
 *
 * Two rows:
 *   - Profile — avatar + nickname, opens the ProfileModal
 *   - Friends — icon + label + optional dot, opens the FriendsModal
 *
 * The parent must render this inside a `relative` container that
 * includes the burger — the menu positions itself with
 * `absolute top-full right-0`.
 *
 * Closes on:
 *   - Escape key
 *   - click outside the panel and the burger
 *   - selecting a row (parent closes it)
 */
export function MobileUserMenu({ open, onClose, onOpenProfile, onOpenFriends }) {
  const { profile } = useProfileContext();
  const { data: pending } = usePending();
  const hasIncoming = (pending?.incoming?.length ?? 0) > 0;
  const { data: inv } = usePendingInvites();
  const hasInvites = (inv?.invites?.length ?? 0) > 0;
  const showDot = hasIncoming || hasInvites;

  const panelRef = useRef(null);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Click outside closes — but clicks on the burger (sibling of the
  // panel inside the same relative wrapper) must NOT close, otherwise
  // the button's own onClick toggle fights this handler and the menu
  // appears stuck open.
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

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Account menu"
      className="
        sm:hidden absolute top-full right-0 mt-2 z-50
        w-64 rounded-lg border border-border bg-surface shadow-2xl
        p-2 space-y-1
      "
    >
      {/* Profile row */}
      <button
        type="button"
        role="menuitem"
        onClick={onOpenProfile}
        className="
          w-full flex items-center gap-3 px-3 py-2.5 rounded-md
          hover:bg-surface-2
          transition-colors text-left
        "
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

      {/* Friends row */}
      <button
        type="button"
        role="menuitem"
        onClick={onOpenFriends}
        className="
          w-full flex items-center gap-3 px-3 py-2.5 rounded-md
          hover:bg-surface-2
          transition-colors text-left
        "
      >
        <span className="h-8 w-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 20 20"
            className="w-4 h-4 text-ink-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="3" />
            <path d="M2 17c0-2.5 2.24-4.5 5-4.5S12 14.5 12 17" />
            <circle cx="15" cy="6" r="2.25" />
            <path d="M13 12.5c1.4-.5 2.6-.5 3.6 0 1.2.6 1.9 1.7 1.9 3" />
          </svg>
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-ink">Friends</span>
          {showDot && (
            <span
              aria-label="Pending friend requests"
              className="w-2 h-2 rounded-full bg-accent shrink-0"
            />
          )}
        </span>
      </button>
    </div>
  );
}