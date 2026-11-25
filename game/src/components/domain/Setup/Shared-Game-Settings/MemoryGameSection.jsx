import { MemoryGamePicker } from '../MemoryGamePicker/MemoryGamePicker.jsx';

export function MemoryGameSection({ value, onChange, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Memory Game</h3>
      <p className="text-xs text-ink-muted">Memorize answers during play, recall them at the end. Adds a cognitive challenge to standard rounds.</p>
      <MemoryGamePicker value={value} onChange={onChange} disabled={readOnly} />
    </section>
  );
}