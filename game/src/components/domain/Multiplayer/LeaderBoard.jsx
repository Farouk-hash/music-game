// game/src/components/domain/Multiplayer/Leaderboard.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BorderContainer } from '../../layout/BorderContainer.jsx';
import { Button } from '../../ui/Button.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ players, scores, onReplay, buildSuddenDeathUrl }) {
  const navigate = useNavigate();
  const [modePickerOpen, setModePickerOpen] = useState(false);

  // Rank players by score, preserving original index for keys.
  const ranked = players
    .map((name, i) => ({ name, score: scores[i] ?? 0, index: i }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0]?.score ?? 0;
  const winners = ranked.filter(p => p.score === top);
  const tied = winners.length > 1 && top > 0;

  // Sudden-death roster = tied players only, in their original order.
  // Players who lost outright sit out the tiebreaker.
  const winnerNames = players.filter((_, i) => (scores[i] ?? 0) === top);

  function startSuddenDeath(mode) {
    if (!buildSuddenDeathUrl) return;
    navigate(buildSuddenDeathUrl(mode, winnerNames));
  }

  return (
    <>
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Final scores
          </p>
          {winners.length === 1 ? (
            <p className="text-2xl font-bold text-ink">
              <span dir="auto">{winners[0].name}</span> wins!
            </p>
          ) : (
            <p className="text-2xl font-bold text-ink">It&apos;s a tie!</p>
          )}
          {tied && (
            <p className="text-sm text-ink-muted">
              Tied at {top} — {winners.length} players
            </p>
          )}
        </div>

        <ul className="space-y-2">
          {ranked.map((p, i) => {
            const isWinner = tied && p.score === top;
            return (
              <li
                key={p.index}
                className={[
                  'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                  isWinner
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-surface-2',
                ].join(' ')}
              >
                <span className="text-lg w-8 text-center">
                  {MEDALS[i] ?? (i + 1)}
                </span>
                <span
                  className={[
                    'flex-1 font-medium',
                    isWinner ? 'text-ink' : 'text-ink-muted',
                  ].join(' ')}
                  dir="auto"
                >
                  {p.name}
                </span>
                <span className="tabular-nums text-xl font-bold text-highlight">
                  {p.score}
                </span>
              </li>
            );
          })}
        </ul>

        {tied && buildSuddenDeathUrl && (
          <div className="rounded-lg border border-accent bg-accent-soft p-4 text-center">
            <p className="mb-3 text-sm text-ink-muted">
              Tied at {top} — sudden death decides it.
            </p>
            <Button
              onClick={() => setModePickerOpen(true)}
              className="w-full"
            >
              ⚔️ Sudden Death — 5 questions
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={onReplay}>Play again</Button>
          <Link to="/setup">
            <Button variant="secondary">Change setup</Button>
          </Link>
        </div>
      </BorderContainer>

      {/* ── Mode picker modal ───────────────────────────── */}
      {modePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4"
          onClick={() => setModePickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em] text-center">
              Sudden death
            </p>
            <p className="text-center text-ink">
              Choose how to answer:
            </p>
            <p className="text-center text-sm text-ink-muted">
              {winnerNames.length} players — {winnerNames.join(', ')}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => startSuddenDeath('options')}
                className="w-full rounded-md border border-border bg-surface-2
                           px-4 py-4 text-left transition-colors hover:border-accent"
              >
                <p className="font-semibold text-ink">⚡ Options</p>
                <p className="text-sm text-ink-muted mt-1">
                  4 options per question, 20 seconds each.
                </p>
              </button>

              <button
                type="button"
                onClick={() => startSuddenDeath('typed')}
                className="w-full rounded-md border border-border bg-surface-2
                           px-4 py-4 text-left transition-colors hover:border-accent"
              >
                <p className="font-semibold text-ink">✍️ Typed answers</p>
                <p className="text-sm text-ink-muted mt-1">
                  No timer. Write the answer and pass the device.
                </p>
              </button>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setModePickerOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}