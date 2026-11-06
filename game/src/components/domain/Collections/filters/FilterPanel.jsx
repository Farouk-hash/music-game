// game/src/components/domain/Collections/filters/FilterPanel.jsx
import { useMemo } from 'react';
import { useCatalog } from '@/hooks/setup/useCatalog.js';
import { FilterGroup } from './FilterGroup.jsx';
import { getQuestionTypeLabel } from '@/constants/questionTypes.js';

export function FilterPanel({ facets, activeFilters, onToggle, onClear }) {
  const { data: catalog } = useCatalog();
  const genreMap = useMemo(() => new Map((catalog?.genres ?? []).map(g => [g.id, g.display_name ?? g.name])), [catalog]);
  const artistMap = useMemo(() => new Map((catalog?.artists ?? []).map(a => [a.id, a.name])), [catalog]);

  const mapToOptions = (map, getLabel) => {
    return Array.from(map.entries())
      .map(([value, count]) => ({
        value,
        count,
        label: getLabel(value) ?? `Unknown (${value})`,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const hasAny = Object.values(activeFilters).some((set) => set && set.size > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Filters</h3>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasAny}
          className={[
            "text-xs transition-colors",
            hasAny ? "text-wrong hover:text-wrong/80" : "text-ink-subtle cursor-not-allowed opacity-50"
          ].join(' ')}
        >
          Clear all
        </button>
      </div>

      <div className="space-y-4">
        {facets.friends?.has('true') && (
          <FilterGroup
            title="Friends"
            options={[{ value: 'true', count: facets.friends.get('true'), label: 'Friend Collections' }]}
            selectedIds={activeFilters.friends}
            onToggle={(v) => onToggle('friends', v)}
          />
        )}

        <FilterGroup
          title="Genres"
          options={mapToOptions(facets.genres, (id) => genreMap.get(id))}
          selectedIds={activeFilters.genres}
          onToggle={(v) => onToggle('genres', v)}
        />
        <FilterGroup
          title="Artists"
          options={mapToOptions(facets.artists, (id) => artistMap.get(id))}
          selectedIds={activeFilters.artists}
          onToggle={(v) => onToggle('artists', v)}
        />
        <FilterGroup
          title="Levels"
          options={mapToOptions(facets.levels, (l) => `Level ${l}`)}
          selectedIds={activeFilters.levels}
          onToggle={(v) => onToggle('levels', v)}
        />
        <FilterGroup
          title="Question Types"
          options={mapToOptions(facets.questionTypes, getQuestionTypeLabel)}
          selectedIds={activeFilters.questionTypes}
          onToggle={(v) => onToggle('questionTypes', v)}
        />
        <FilterGroup
          title="Modes"
          options={mapToOptions(facets.modes, (m) => m === 'speed' ? 'Speed' : 'Collect')}
          selectedIds={activeFilters.modes}
          onToggle={(v) => onToggle('modes', v)}
        />
        <FilterGroup
          title="Instruments"
          options={mapToOptions(facets.instruments, (i) => i.charAt(0).toUpperCase() + i.slice(1))}
          selectedIds={activeFilters.instruments}
          onToggle={(v) => onToggle('instruments', v)}
        />
      </div>
    </div>
  );
}