// game/src/components/domain/Rounds/PromptSource.jsx
import { AudioPlayer } from './AudioPlayer.jsx';
import { LyricsSnippet } from './LyricsSnippet.jsx';

/**
 * Renders the prompt media for a round.
 *
 *   - round.clip   → audio clip (existing behavior)
 *   - round.lyrics → text snippet (new lyrics questions)
 *
 * The Play routes pass the current round object straight through,
 * so this component is the only place that decides which renderer
 * to use.
 */
export function PromptSource({ round }) {
  if (!round) return null;
  if (round.lyrics) return <LyricsSnippet text={round.lyrics} />;
  if (round.clip)   return <AudioPlayer src={round.clip.serveUrl} />;
  return null;
}