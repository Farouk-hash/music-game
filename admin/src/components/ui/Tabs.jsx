
export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div
      className={`flex items-center gap-1 border-b border-surface-border overflow-x-auto ${className}`}
      role="tablist"
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`
              relative px-4 py-2.5 text-sm font-medium whitespace-nowrap
              transition-colors
              ${isActive
                ? 'text-brand-500'
                : 'text-ink-muted hover:text-ink'}
            `}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`mr-1.5 text-xs ${isActive ? 'text-brand-400' : 'text-ink-subtle'}`}>
                ({tab.count})
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand-500 rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
}