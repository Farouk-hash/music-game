// game/src/components/domain/Collections/primitives/CollectionCover.jsx
import { useWorkerImage } from '../../../../hooks/ui/useWorkerImage.js';

export function CollectionCover({ collection, size = 'md' }) {
  const { src, isLoaded } = useWorkerImage(collection?.cover);

  const px = size === 'sm' ? 48 : size === 'lg' ? 96 : 72;
  const dim = `${px}px`;

  const seed = collection?.name ?? '';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const hue = ((h % 60) + 15);
  const grad = `linear-gradient(135deg, hsl(${hue}, 45%, 28%), hsl(${hue + 30}, 55%, 18%))`;

  return (
    <div
      className="rounded-md border border-border overflow-hidden shrink-0 bg-surface-2 flex items-center justify-center"
      style={{ width: dim, height: dim }}
      aria-hidden={!src}
    >
      {src && isLoaded ? (
        <img
          src={src}
          alt={`${collection.name} cover`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full"
          style={{ backgroundImage: grad }}
          aria-label={`${collection?.name ?? 'Collection'} cover`}
        />
      )}
    </div>
  );
}