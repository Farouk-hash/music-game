// game/src/components/domain/Rounds/LyricsSnippet.jsx
export function LyricsSnippet({ text }) {
  if (!text) return null;

  return (
    <div className="w-full min-w-0 rounded-lg border border-border bg-surface-2 p-6 space-y-3">
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
        From the lyrics
      </p>
      <div 
        dir="auto" 
        className="max-h-48 overflow-y-auto pr-2 text-lg leading-relaxed text-ink whitespace-pre-line custom-scrollbar w-full"
      >
        {text}
      </div>
    </div>
  );
}