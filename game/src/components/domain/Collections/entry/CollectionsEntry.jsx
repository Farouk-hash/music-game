// game/src/components/domain/Collections/entry/CollectionsEntry.jsx
import { IconCollection } from "../../../../icons";

export function CollectionsEntry({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Collections"
      className={[
        'relative inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-surface-2',
        'text-ink-muted hover:border-accent-2 hover:text-ink transition-colors',
      ].join(' ')}
    >
      <IconCollection className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline text-sm">Collections</span>
    </button>
  );
}