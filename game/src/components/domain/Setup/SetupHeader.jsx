// game/src/components/domain/Setup/SetupHeader.jsx
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { OrbitArt } from '@/components/orbit/OrbitArt.jsx';

export function SetupHeader() {
  return (
    <BorderContainer border="all" className="p-8">
      <style>{`
        @keyframes eq-bounce {
          0%, 100% { transform: scaleY(0.4); }
          50%      { transform: scaleY(1); }
        }
        .eq-bar {
          display: inline-block;
          width: 3px;
          height: 14px;
          background-color: currentColor;
          border-radius: 2px;
          transform-origin: bottom;
          animation: eq-bounce 1s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        
        {/* Left Side: Header Text */}
        <header className="space-y-3 flex-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-tight">
            What do you want to be asked about?
          </h1>
          
          <p className="text-ink-muted max-w-xl text-lg leading-relaxed flex flex-wrap items-center gap-2">
            <span>Pick the genres you want to play — or choose all —</span>
            
            {/* Animated Mini Bar Chart */}
            <span className="inline-flex items-end gap-[3px] h-4 text-accent mb-0.5" aria-label="Loading">
              {[0.1, 0.3, 0.5, 0.2, 0.4].map((delay, i) => (
                <span
                  key={i}
                  className="eq-bar"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </span>
          </p>
        </header>

        {/* Right Side: Mini Orbit Art */}
        <div className="shrink-0 flex justify-center lg:justify-end">
          <OrbitArt
            className="w-[min(40vw,10rem)] sm:w-[min(30vw,12rem)] lg:w-48 xl:w-52" 
            ringText="SETUP • GENRES • ARTISTS • YEARS • "
          />
        </div>

      </div>
    </BorderContainer>
  );
}