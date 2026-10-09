import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-20 space-y-4">
      <h1 className="text-3xl font-bold text-ink">Not found</h1>
      <p className="text-ink-muted">That page doesn't exist.</p>
      <Link to="/" className="text-accent hover:text-accent-2 inline-block">
        ← Back home
      </Link>
    </div>
  );
}