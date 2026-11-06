// game/src/components/domain/Rounds/PromptSource.jsx
import { AudioPlayer } from './AudioPlayer.jsx';
import { LyricsSnippet } from './LyricsSnippet.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx'; 

export function PromptSource({ round }) {
  if (!round) return null;
  
  // Create a key based on what's being rendered to trigger animation on change
  const revealKey = round.clip?.serveUrl || round.lyrics;

  if (round.lyrics) {
    return (
      <Reveal key={`lyrics-${revealKey}`} direction="down" delay={0} distance={30}>
        <LyricsSnippet text={round.lyrics} />
      </Reveal>
    );
  }

  if (round.clip) {
    return (
      <Reveal key={`clip-${revealKey}`} direction="down" delay={0} distance={30}>
        <AudioPlayer src={round.clip.serveUrl} />
      </Reveal>
    );
  }

  return null;
}