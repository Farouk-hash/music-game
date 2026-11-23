import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/profiles/useProfile.js';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';
import { ProfileChip } from '../domain/Profile/ProfileChip.jsx';
import { ProfileModal } from '../domain/Profile/ProfileModal.jsx';
import { FriendsEntry } from '../domain/Follow/FriendsEntry.jsx';
import { FriendsModal } from '../domain/Follow/FriendsModal.jsx';
import { CollectionsEntry } from '../domain/Collections/entry/CollectionsEntry.jsx';
import { CollectionsModal } from '../domain/Collections/modal/CollectionsModal.jsx';
import { MobileUserMenu } from './MobileUserMenu.jsx';
import { IconBurger } from '@/icons/index.js';
import logoUrl from '@/assets/raffat.png';

export function Header() {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { profile } = useProfile();
  const isOnline = useNetworkStatus();

  // ✅ UPDATED LOGIC: Disable if offline. 
  // We don't care if we have a cached profile; we can't fetch new data anyway.
  const isDisabled = !isOnline;

  // ✅ Safe handlers that do nothing if disabled
  const handleOpenCollections = () => {
    if (!isDisabled) setCollectionsOpen(true);
  };
  const handleOpenFriends = () => {
    if (!isDisabled) setFriendsOpen(true);
  };
  const handleOpenProfile = () => {
    if (!isDisabled) setProfileOpen(true);
  };

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
            <img 
              src={logoUrl} 
              alt="Music Game Logo" 
              className="w-6 h-6 object-contain" 
            />
            <span className="text-sm uppercase tracking-[0.2em]">Music Game</span>
          </Link>

          {/* Desktop: split entries — Collections · Friends · Profile */}
          <nav className="hidden sm:flex items-center gap-3">
            <CollectionsEntry onClick={handleOpenCollections} disabled={isDisabled} />
            <FriendsEntry onClick={handleOpenFriends} disabled={isDisabled} />
            <ProfileChip disabled={isDisabled} onClick={handleOpenProfile} />
          </nav>

          {/* Mobile: burger + anchored dropdown */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              disabled={isDisabled} 
              className={`
                inline-flex items-center justify-center
                w-10 h-10 rounded-md border border-border
                bg-surface-2 text-ink
                hover:border-accent-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
              `}
            >
             <IconBurger />
            </button>

            <MobileUserMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              onOpenProfile={handleOpenProfile}
              onOpenFriends={handleOpenFriends}
              onOpenCollections={handleOpenCollections}
              disabled={isDisabled} 
            />
          </div>
        </div>
      </header>

      {/* Desktop modals */}
      <CollectionsModal
        open={collectionsOpen}
        onClose={() => setCollectionsOpen(false)}
      />
      <FriendsModal open={friendsOpen} onClose={() => setFriendsOpen(false)} />

      {/* Mobile-only: profile modal opened from the menu, not from the chip */}
      <div className="sm:hidden">
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    </>
  );
}