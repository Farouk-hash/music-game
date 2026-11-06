// game/src/components/domain/Collections/tiles/CollectionTileGrid.jsx
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { SkeletonTileGrid } from '../../Tile/SkeletonTileGrid.jsx';
import { useMediaQuery } from '@/hooks/ui/useMediaQuery.js';
import { CollectionTileAction } from './CollectionTileAction.jsx';
import { resolveCoverUrl } from '@/lib/workerUrl.js';
import { IconPlus, IconMinus } from '@/icons';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useSmartPagination } from '@/hooks/ui/useSmartPagination.js';
import { Reveal } from '@/components/ui/Reveal.jsx';

const PAGE_SIZE_MOBILE = 4;
const PAGE_SIZE_DESKTOP = 6;

function summarizeRounds(collection) {
  const rounds = Array.isArray(collection.rounds) ? collection.rounds.length : 0;
  if (rounds === 0) return '0 rounds';
  return `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`;
}

function summarizeLevels(collection) {
  const levels = Array.isArray(collection.levels) ? collection.levels : [];
  if (levels.length === 0) return null;
  return levels.map((l) => `L${l}`).join(' · ');
}

function buildSubtitle(collection, isMine, profileId) {
  const parts = [summarizeRounds(collection), summarizeLevels(collection)].filter(Boolean);
  
  if (!isMine && collection.author) {
    if (collection.followStatus === 'friends') {
      parts.push(`by ${collection.author.nickname} (Friend)`);
    } else {
      parts.push(`by ${collection.author.nickname}`);
    }
  } else if (isMine && collection.profileId !== profileId) {
    parts.push('Clone');
  }
  
  return parts.join(' · ');
}

export function CollectionTileGrid({
  collections,
  view = 'grid',
  onEdit,
  onDelete,
  onClone,
  isMine = true,
  resetKey,
  pageSize,
  isLoading = false,
  emptyMessage = 'No collections yet.',
}) {
  const { id: profileId } = useProfileContext();
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const resolvedPageSize =
    pageSize != null
      ? pageSize
      : (isDesktop ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE);

  const paginate = resolvedPageSize > 0 && collections.length > resolvedPageSize;

  const { pagination, direction } = useSmartPagination(
    paginate ? collections : [],
    {
      pageSize: resolvedPageSize || 9999,
      resetKey: `${resetKey ?? ''}|${collections.length}|${resolvedPageSize}`,
    }
  );

  const visible = paginate ? pagination.items : collections;

  if (isLoading && collections.length === 0) {
    return <SkeletonTileGrid count={resolvedPageSize || 6} view={view} />;
  }

  if (!isLoading && collections.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center border border-dashed border-border rounded-md">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Reveal
        key={paginate ? pagination.page : 'all'}
        direction={direction}
        distance={80}
        duration={400}
      >
        {/* 
          MAGIC HAPPENS HERE:
          [&>div]:grid-cols-2 -> Targets the inner TileGrid container
          md:[&>div]:grid-cols-2 -> 2 columns on desktop (instead of 5)
          lg:[&>div]:grid-cols-3 -> 3 columns on large screens
          [&_.aspect-\[4\/3\]]:aspect-square -> Force all tiles to be square!
        */}
        <div className="
          [&>div]:grid-cols-2 
          sm:[&>div]:grid-cols-2 
          md:[&>div]:grid-cols-3 
          lg:[&>div]:grid-cols-3 
          xl:[&>div]:grid-cols-4
          [&_.aspect-\[4\/3\]]:aspect-square
        ">
          <TileGrid
            items={visible}
            selectedIds={new Set()}
            onToggle={() => {}}
            onTileClick={(c) => onEdit?.(c)}
            getTitle={(c) => c.name}
            getSubtitle={(c) => buildSubtitle(c, isMine, profileId)}
            getImage={(c) => resolveCoverUrl(c.cover) ?? undefined}
            getTileClassName={(c) => {
              const isClone = isMine && c.profileId !== profileId;
              if (isMine) {
                return isClone
                  ? 'border-highlight hover:border-highlight/80'
                  : 'border-accent hover:border-accent/80';
              }
              return 'border-correct hover:border-correct/80';
            }}
            emptyMessage={emptyMessage}
            resetKey={resetKey}
            view={view}
            paginated={paginate}
            renderHeart={(c) => {
              const isClone = isMine && c.profileId !== profileId;
              return (
                <div className="flex gap-1 items-center">
                  {isMine && !isClone && onDelete && (
                    <CollectionTileAction onClick={() => onDelete(c)} />
                  )}
                  {!isMine && (
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (c.isCloned) {
                          onDelete?.(c);
                        } else {
                          onClone?.(c);
                        }
                      }}
                      className={[
                        'flex items-center justify-center h-7 w-7 rounded-full transition-all',
                        c.isCloned 
                          ? 'bg-wrong/80 text-white hover:bg-wrong' 
                          : 'bg-black/40 text-white/80 hover:bg-accent hover:text-bg'
                      ].join(' ')}
                      title={c.isCloned ? 'Remove from my collections' : 'Save to my collections'}
                    >
                      {c.isCloned 
                        ? <IconMinus className="w-4 h-4 shrink-0" /> 
                        : <IconPlus className="w-4 h-4 shrink-0" />}
                    </button>
                  )}
                </div>
              );
            }}
          />
        </div>
      </Reveal>
      {paginate && <Pagination pagination={pagination} />}
    </div>
  );
}