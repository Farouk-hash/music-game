// game/src/components/domain/Rounds/LyricsSnippet.jsx
/**
 * Renders a lyric snippet for lyrics-based questions.
 *
 * The snippet is 2–3 lines pulled from the middle of the song's
 * lyrics. The `\n` between lines is preserved by `whitespace-pre-line`.
 *
 * `dir="auto"` lets the browser pick RTL for Arabic content and
 * LTR for anything Latin — important because some scraped lyrics
 * are transliterated.
 *
 *   <LyricsSnippet text={"حياتي عامله زي رصيف\nفي ناس وجعوني و مغادرة"} />
 */
export function LyricsSnippet({ text }) {
  if (!text) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-6 space-y-3">
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
        From the lyrics
      </p>
      <p
        dir="auto"
        className="text-lg leading-relaxed text-ink whitespace-pre-line"
      >
        {text}
      </p>
    </div>
  );
}