// game/src/components/domain/SuddenDeath/PassAndPlayInput.jsx
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button.jsx';
import { BorderContainer } from '../../layout/BorderContainer.jsx';
import { IconEye, IconEyeOff } from '../../../lib/icons.jsx';

/**
 * Pass-and-play input, styled to match the multiplayer question card.
 *
 * answering → a text input with an eye toggle + commit button
 * handoff   → a "pass the device" card, styled like TurnBanner
 */
export default function PassAndPlayInput({
  phase,
  currentPlayerId,
  nextPlayerId,
  playerLabels = {},
  draft,
  setDraft,
  onCommit,
  onReady,
  prompt,
  eyebrow,
}) {
  const inputRef = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (phase === 'answering') {
      setHidden(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [phase, currentPlayerId]);

  const label = id => playerLabels[id] ?? id ?? '';

  /* ── Handoff card — mirrors TurnBanner ──────────────── */
  if (phase === 'handoff') {
    return (
      <BorderContainer border="all" className="p-8 text-center space-y-6">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Answer hidden
        </p>
        <div className="space-y-2">
          <p className="text-ink-muted text-sm">Pass the device to</p>
          <p
            className="text-3xl font-extrabold text-ink leading-tight"
            dir="auto"
          >
            {label(nextPlayerId)}
          </p>
        </div>
        <p className="text-sm text-ink-muted">
          Don&apos;t peek. Tap Start when ready.
        </p>
        <Button size="lg" onClick={onReady}>Start</Button>
      </BorderContainer>
    );
  }

  /* ── Answering card ─────────────────────────────────── */
  const canCommit = draft.trim().length > 0;

  function handleCommit() {
    if (canCommit) onCommit(draft);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommit();
    }
  }

  return (
    <div className="space-y-6">
      {eyebrow && (
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      )}

      {prompt && (
        <p className="text-xl font-bold text-ink leading-snug">{prompt}</p>
      )}

      <div className="text-sm text-ink-muted">
        <span className="text-ink font-semibold" dir="auto">
          {label(currentPlayerId)}
        </span>{' '}
        — your turn
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type={hidden ? 'password' : 'text'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          dir="auto"
          className="w-full rounded-md border border-border bg-surface-2 px-4 py-3 pe-12
                     text-lg text-ink outline-none focus:border-accent transition-colors
                     placeholder:text-ink-subtle"
        />
        <button
          type="button"
          onClick={() => setHidden(h => !h)}
          aria-label={hidden ? 'Show answer' : 'Hide answer'}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-2
                     text-ink-muted transition-colors hover:text-ink"
        >
          {hidden ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleCommit} disabled={!canCommit}>
          Commit &amp; hide
        </Button>
      </div>
    </div>
  );
}