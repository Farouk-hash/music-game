// game/src/components/layout/Header.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProfileChip } from '../domain/Profile/ProfileChip.jsx';
import { ProfileModal } from '../domain/Profile/ProfileModal.jsx';
import { FriendsEntry } from '../domain/Follow/FriendsEntry.jsx';
import { FriendsModal } from '../domain/Follow/FriendsModal.jsx';
import { MobileUserMenu } from './MobileUserMenu.jsx';

export function Header() {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-close the mobile menu if the viewport crosses into desktop.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia('(min-width: 640px)');
    function onChange(e) { if (e.matches) setMenuOpen(false); }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [menuOpen]);

  return (
    <>
      <header className="app-header border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-ink font-semibold hover:text-accent transition-colors"
          >
            <span className="text-lg" aria-hidden>🎵</span>
            <span className="text-sm uppercase tracking-[0.2em]">Music Game</span>
          </Link>

          {/* Desktop: split entries */}
          <nav className="hidden sm:flex items-center gap-3">
            <FriendsEntry onClick={() => setFriendsOpen(true)} />
            <ProfileChip />
          </nav>

          {/* Mobile: burger + anchored dropdown */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="
                inline-flex items-center justify-center
                w-10 h-10 rounded-md border border-border
                bg-surface-2 text-ink
                hover:border-accent-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <MobileUserMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              onOpenProfile={() => { setMenuOpen(false); setProfileOpen(true); }}
              onOpenFriends={() => { setMenuOpen(false); setFriendsOpen(true); }}
            />
          </div>
        </div>
      </header>

      {/* Desktop modals */}
      <FriendsModal open={friendsOpen} onClose={() => setFriendsOpen(false)} />

      {/* Mobile-only: profile modal opened from the menu, not from the chip */}
      <div className="sm:hidden">
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    </>
  );
}