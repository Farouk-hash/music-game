import { IconCollection } from "@/icons";

export function CollectionsEntry({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Collections"
      className={[
        'relative inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-surface-2',
        'text-ink-muted transition-colors',
        disabled 
          ? 'opacity-50 cursor-not-allowed pointer-events-none' 
          : 'hover:border-accent-2 hover:text-ink',
      ].join(' ')}
    >
      <IconCollection className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline text-sm">Collections</span>
    </button>
  );
}