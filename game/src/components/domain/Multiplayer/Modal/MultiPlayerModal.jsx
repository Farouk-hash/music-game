// game/src/components/domain/Multiplayer/MultiplayerModal.jsx
import { useState } from 'react';
import { LevelModalWrapper } from '../../Setup/Modals/LevelModalWrapper.jsx';
import { LEVELS, PLAYER_COUNTS } from '@/constants/MultiPlayers.js';
import { MultiplayerModePicker } from '../../Setup/MultiPlayerPotatoMode/GameModePicker.jsx';
import { useGameSettings } from '@/context/GameSettingsContext.jsx';

function defaultNames(n) {
  return Array.from({ length: n }, (_, i) => `Player ${i + 1}`);
}

export function MultiplayerModal({
  open,
  onClose,
  onStart,
  starting,
  disabledTypes = new Set(),
  disabledReasons,
  reversedClipsCount = 0,
  allowInstruments = true,
  defaultRoundsPerPlayer = 5,
}) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(() => defaultNames(2));
  const [level, setLevel] = useState(1);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(defaultRoundsPerPlayer);

  // Single source of truth: the settings context (persisted in localStorage).
  // Before, the modal kept its own copy, so Setup (which builds the payload from
  // the context) never saw the player's choice.
  const { multiplayerMode, setMultiplayerMode } = useGameSettings();

  function changePlayerCount(n) {
    setPlayerCount(n);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(`Player ${next.length + 1}`);
      return next.slice(0, n);
    });
  }

  function setName(i, value) {
    setNames((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  const canStart =
    !starting &&
    names.length === playerCount &&
    names.every(n => n.trim().length > 0);

  function handleStart() {
    if (!canStart) return;
    onStart({
      playerCount,
      names: names.map(n => n.trim()),
      level,
      roundsPerPlayer,
      multiplayerMode, // 'normal' | 'hotpotato'
    });
  }

  return (
    <LevelModalWrapper
      open={open}
      onClose={onClose}
      onPlay={handleStart}
      eyebrow="Multiplayer"
      title="Pass the device between turns"
      disabledTypes={disabledTypes}
      disabledReasons={disabledReasons}
      reversedClipsCount={reversedClipsCount}
      allowInstruments={allowInstruments}
      hideRoundCount={true}
      canPlay={canStart}
      playLabel={starting ? 'Starting…' : 'Play'}
      isInMultiplayerModal={true} // hides the solo-only memory game picker
    >
      <p className="text-sm text-ink-muted">
        Everyone plays on this device, taking turns.{' '}
        {multiplayerMode === 'hotpotato'
          ? 'Everyone answers the same questions, results are revealed at the end.'
          : 'Rounds alternate between players.'}
      </p>

      {/* Player count */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Players</p>
        <div className="flex gap-2">
          {PLAYER_COUNTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => changePlayerCount(n)}
              aria-pressed={playerCount === n}
              className={[
                'flex-1 h-12 rounded-md border text-base font-semibold transition-colors',
                playerCount === n
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Names */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Names</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {names.map((name, i) => (
            <input
              key={i}
              type="text"
              value={name}
              onChange={(e) => setName(i, e.target.value)}
              dir="auto"
              maxLength={20}
              placeholder={`Player ${i + 1}`}
              className="h-10 px-3 rounded-md bg-surface-2 text-ink border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
          ))}
        </div>
      </div>

      {/* Level */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Level</p>
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map(l => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLevel(l.key)}
              aria-pressed={level === l.key}
              className={[
                'rounded-md border px-3 py-3 text-left transition-colors',
                level === l.key
                  ? 'bg-accent-soft border-accent text-ink'
                  : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2 hover:text-ink',
              ].join(' ')}
            >
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="text-xs mt-0.5 opacity-80">{l.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Game mode: normal | hotpotato */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Game Mode</p>
        <MultiplayerModePicker
          value={multiplayerMode}
          onChange={setMultiplayerMode}
        />
      </div>
    </LevelModalWrapper>
  );
}