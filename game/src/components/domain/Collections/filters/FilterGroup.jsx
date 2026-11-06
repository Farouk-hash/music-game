// game/src/components/domain/Collections/filters/FilterGroup.jsx
import { useState } from 'react';
import { IconChevronDown } from '@/icons';

export function FilterGroup({ title, options, selectedIds, onToggle }) {
  const [isOpen, setIsOpen] = useState(false);

  if (options.length === 0) return null;

  return (
    <div className="border-b border-border pb-3 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between w-full py-2 text-left group"
      >
        <span className="text-xs font-semibold text-highlight uppercase tracking-[0.2em] group-hover:text-ink transition-colors">
          {title}
        </span>
        <IconChevronDown
          className={`w-4 h-4 text-ink-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-1.5 pt-1">
          {options.map((opt) => {
            const active = selectedIds.has(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer group text-sm"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggle(opt.value)}
                  className="h-3.5 w-3.5 accent-accent rounded-sm border-border"
                />
                <span className={`flex-1 truncate transition-colors ${active ? 'text-ink' : 'text-ink-muted group-hover:text-ink'}`}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-ink-subtle tabular-nums">
                  ({opt.count})
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}