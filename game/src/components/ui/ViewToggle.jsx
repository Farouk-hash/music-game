// game/src/components/ui/ViewToggle.jsx
import { IconDense, IconGrid, IconList } from '../../lib/icons.jsx';

/**
 * A two-button toggle for switching between grid and list layouts.
 * Fits inline in a CollapsibleSection header.
 *
 *   <ViewToggle value={view} onChange={setView} />
 */
export function ViewToggle({ value, onChange }) {
  const options = [
    { key: 'grid',  label: 'Grid',  icon: <IconGrid className="w-4 h-4" /> },
    { key: 'dense', label: 'Dense', icon: <IconDense className="w-4 h-4" /> },
    { key: 'list',  label: 'List',  icon: <IconList className="w-4 h-4" /> },
  ];

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-surface-2 p-0.5">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            aria-label={`${opt.label} view`}
            title={`${opt.label} view`}
            className={[
              'flex items-center justify-center h-7 w-8 rounded-sm transition-colors',
              active
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-subtle hover:text-ink',
            ].join(' ')}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}