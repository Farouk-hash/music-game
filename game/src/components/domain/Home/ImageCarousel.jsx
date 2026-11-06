// game/src/components/domain/Home/ImageCarousel.jsx
import { useCatalog } from '@/hooks/setup/useCatalog.js';
import { Image } from '@/components/ui/Image.jsx';
import { useMemo } from 'react';

const MARQUEE_CSS = `
  @keyframes scroll-marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee {
    animation: scroll-marquee 40s linear infinite;
  }
  .pause-on-hover:hover .animate-marquee {
    animation-play-state: paused;
  }
`;

export function ImageCarousel() {
  const { data } = useCatalog();
  const genres = data?.genres ?? [];
  const artists = data?.artists ?? [];

  const items = useMemo(() => {
    const genreItems = genres
      .filter(g => g.image)
      .map(g => ({ id: `g-${g.id}`, image: g.image }));

    const artistItems = artists
      .filter(a => a.image)
      .map(a => ({ id: `a-${a.id}`, image: a.image }));

    const mixed = [];
    const max = Math.max(genreItems.length, artistItems.length);
    for (let i = 0; i < max; i++) {
      if (genreItems[i]) mixed.push(genreItems[i]);
      if (artistItems[i]) mixed.push(artistItems[i]);
    }
    
    return mixed.sort(() => 0.5 - Math.random()).slice(0, 20);
  }, [genres, artists]);

  if (items.length === 0) return null;

  const loopItems = [...items, ...items];

  return (
    <>
      <style>{MARQUEE_CSS}</style>
      <div className="relative w-full overflow-hidden pause-on-hover py-4">

        <div className="flex animate-marquee gap-4 w-max items-center">
          {loopItems.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="relative shrink-0 h-32 sm:h-40 rounded-lg overflow-hidden border border-border bg-surface-2"
            >
              <Image
                src={item.image}
                alt=""
                className="h-full w-auto object-cover"
                wrapperClass="h-full w-auto" 
                fallbackLetter=""
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}