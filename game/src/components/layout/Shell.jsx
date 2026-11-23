import { Header } from './Header.jsx';
import { OfflineBanner } from '@/components/network/OfflineBanner.jsx'; 

export function Shell({ children }) {
  return (
    <div className="min-h-full bg-bg text-ink flex flex-col">
      <OfflineBanner />
      <Header />

      <main className="flex-1 flex flex-col">
        <div className="max-w-5xl w-full mx-auto px-6 py-10 flex-1">
          {children}
        </div>
      </main>

      <footer className="border-t border-border shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-ink-subtle">
          Built for fun.
        </div>
      </footer>
    </div>
  );
}