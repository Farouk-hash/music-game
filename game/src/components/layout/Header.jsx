// game/src/components/layout/Header.jsx
import { Link } from 'react-router-dom';
import { ProfileChip } from '../domain/Profile/ProfileChip.jsx';

export function Header() {

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-ink font-semibold hover:text-accent transition-colors"
        >
          <span className="text-lg" aria-hidden>🎵</span>
          <span className="text-sm uppercase tracking-[0.2em]">Music Game</span>
        </Link>

        <nav className="flex items-center gap-3">
          
          <ProfileChip />
        </nav>
      </div>
    </header>
  );
}