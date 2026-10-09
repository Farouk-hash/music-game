// src/components/layout/Header.jsx
import { Link, NavLink } from 'react-router-dom';
import { Container } from './Container';

export function Header({ actions = null }) {
  const linkClass = ({ isActive }) =>
    `text-sm transition-colors ${
      isActive ? 'text-brand-500 font-medium' : 'text-ink-muted hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-10 bg-surface-muted border-b border-surface-border">
      <Container size="lg">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="w-7 h-7 rounded-md bg-brand-500 text-surface-DEFAULT flex items-center justify-center text-sm font-bold">
                ♪
              </span>
              <span>Home</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-4">
              <NavLink to="/genres"  className={linkClass}>Genres</NavLink>
              <NavLink to="/artists" className={linkClass}>Artists</NavLink>
              <NavLink to="/quran" className={linkClass}>Quran</NavLink>
              <NavLink to="/published/genres"  className={linkClass}>Published Genres</NavLink>
              <NavLink to="/published/artists" className={linkClass}>Published Artists</NavLink>
              <NavLink to="/published/tracks" className={linkClass}>Published Tracks</NavLink>
              <NavLink to="/published/lyrics" className={linkClass}>Lyrics</NavLink>
              <NavLink to="/published/albumaty" className={linkClass}>Albumaty</NavLink>
              <NavLink to="/published/album-years" className={linkClass}>Released-Years</NavLink>


            </nav>
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </Container>
    </header>
  );
}