// game/src/components/layout/Shell.jsx
import { Header } from './Header.jsx';

export function Shell({ children }) {
  return (
    <div className="min-h-full bg-bg text-ink flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-ink-subtle">
          Built for fun.
        </div>
      </footer>
    </div>
  );
}