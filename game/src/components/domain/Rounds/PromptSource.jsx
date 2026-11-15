// game/src/components/domain/Rounds/PromptSource.jsx
import { AudioPlayer } from './AudioPlayer.jsx';
import { LyricsSnippet } from './LyricsSnippet.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx'; 

export function PromptSource({ round }) {
  if (!round) return null;
  
  const revealKey = round.clip?.serveUrl || round.lyrics;

  if (round.lyrics) {
    return (
      <div className="w-full">
        <Reveal key={`lyrics-${revealKey}`} direction="down" delay={0} distance={30}>
          <LyricsSnippet text={round.lyrics} />
        </Reveal>
      </div>
    );
  }

  if (round.clip) {
    return (
      <div className="w-full">
        <Reveal key={`clip-${revealKey}`} direction="down" delay={0} distance={30}>
          <AudioPlayer src={round.clip.serveUrl} />
        </Reveal>
      </div>
    );
  }

  return null;
}