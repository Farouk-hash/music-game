// game/src/components/domain/Templates/TemplateTileGrid.jsx
import { TileGrid } from '../Tile/TileGrid.jsx';
import { SkeletonTileGrid } from '../Tile/SkeletonTileGrid.jsx';
import { resolveCoverUrl } from '@/lib/workerUrl.js';
import { Reveal } from '@/components/ui/Reveal.jsx';

function summarizeRounds(t) {
  const rounds = Array.isArray(t.rounds) ? t.rounds.length : 0;
  if (rounds === 0) return '0 rounds';
  return `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`;
}

function summarizeLevels(t) {
  const levels = Array.isArray(t.levels) ? t.levels : [];
  if (levels.length === 0) return null;
  return levels.map(l => `L${l}`).join(' · ');
}

function buildSubtitle(t) {
  const parts = [summarizeRounds(t), summarizeLevels(t)].filter(Boolean);
  if (t.description) parts.push(t.description);
  return parts.join(' · ');
}

export function TemplateTileGrid({
  templates,
  view = 'grid',
  onPick,
  isLoading = false,
  emptyMessage = 'No templates available.',
}) {
  if (isLoading && templates.length === 0) {
    return <SkeletonTileGrid count={6} view={view} />;
  }

  if (!isLoading && templates.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center border border-dashed border-border rounded-md">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Reveal direction="up" distance={80} duration={400}>
        <div className="
          [&>div]:grid-cols-2
          sm:[&>div]:grid-cols-2
          md:[&>div]:grid-cols-3
          lg:[&>div]:grid-cols-3
          xl:[&>div]:grid-cols-4
          [&_.aspect-\[4\/3\]]:aspect-square
        ">
          <TileGrid
            items={templates}
            selectedIds={new Set()}
            onToggle={() => {}}
            onTileClick={(t) => onPick?.(t)}
            getTitle={(t) => t.name}
            getSubtitle={(t) => buildSubtitle(t)}
            getImage={(t) => resolveCoverUrl(t.cover) ?? undefined}
            getTileClassName={() => 'border-accent hover:border-accent/80'}
            emptyMessage={emptyMessage}
            view={view}
            paginated={false}
            renderHeart={() => null}
          />
        </div>
      </Reveal>
    </div>
  );
}