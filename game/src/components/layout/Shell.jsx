// game/src/components/layout/Shell.jsx
export function Shell({ children }) {
  return (
    <div className="min-h-full bg-bg text-ink flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-ink">Game</span>
          <span className="text-xs text-ink-subtle">v0.1</span>
        </div>
      </header>

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