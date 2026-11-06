// game/src/components/layout/Hero.jsx
import { Link } from 'react-router-dom';
import { ImageCarousel } from "../domain/Home/ImageCarousel";
import { OrbitArt } from "../orbit/OrbitArt";
import { BorderContainer } from "./BorderContainer";
import { StatGrid } from "../domain/Home/StatGrid";
import { Button } from "@/components/ui/Button.jsx";

export function Hero({ eyebrow, title, subtitle, stats, isLoading }) {
  return (
    <BorderContainer
      border="all"
      surface="raised"
      padding="xl"
      className="overflow-hidden relative"
    >
      <div className="space-y-8 pb-6">
        
        {/* Top Section: Stats Grid & Orbit Art */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Left Side: Stats Grid */}
          <div className="order-2 lg:order-1 w-full">
            {stats && stats.length > 0 && (
              <StatGrid stats={stats} isLoading={isLoading} />
            )}
          </div>

          {/* Right Side: Orbit Art */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <OrbitArt 
              className="w-[min(80vw,20rem)] sm:w-[min(60vw,24rem)] lg:w-full lg:max-w-[32rem]" 
              ringText="MUSICA • NAME THAT TRACK • MULTI ROUNDS • "
            />
          </div>
          
        </section>

        {/* Middle: Full-Width Image Carousel */}
        {!isLoading && (
          <div className="w-full">
            <ImageCarousel />
          </div>
        )}

        {/* Bottom: Title, Subtitle & CTA */}
        <div className="max-w-3xl mx-auto text-center space-y-6 pt-4">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-script text-highlight leading-[1.05]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-ink-muted leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Link to="/setup" className="block w-full">
              <Button size="lg" disabled={isLoading} className="w-full h-12 text-base">
                Start the game
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </BorderContainer>
  );
}