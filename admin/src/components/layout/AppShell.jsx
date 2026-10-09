import { Header } from './Header';
import { Container } from './Container';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <Container size="lg" className="py-6">
          {children}
        </Container>
      </main>
      <footer className="py-4 text-center text-xs text-ink-subtle">
        Admin panel · local
      </footer>
    </div>
  );
}