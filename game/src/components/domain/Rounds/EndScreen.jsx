// game/src/components/game/EndScreen.jsx
import { Link } from 'react-router-dom';
import { BorderContainer } from '../../layout/BorderContainer.jsx';
import { Button } from '../../ui/Button.jsx';
import { storage } from '../../../lib/storage.js';

export function EndScreen({ score, total, lifelineCost = 0, onReplay }) {
  // Calculate correct answers based on the ledger
  const correctCount = score + lifelineCost; 
  
  // Clamp percentage at 0 so it never looks broken if score goes negative
  const pct = total > 0 ? Math.max(0, Math.round((correctCount / total) * 100)) : 0;
  
  const highScore = storage.getHighScore();
  // Only show "New high score" if it's positive and beats the best
  const isNewBest = score > 0 && score >= highScore;

  return (
    <BorderContainer border="all" className="p-8 text-center space-y-6 max-w-lg mx-auto">
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
        Results
      </p>

      <div>
        <p className="text-6xl font-extrabold tabular-nums text-ink leading-none">
          {score}
          <span className="text-ink-subtle text-4xl">/{total}</span>
        </p>
        
        {/* Ledger breakdown (only shows if lifelines were used) */}
        {lifelineCost > 0 ? (
          <div className="mt-4 flex flex-col items-center gap-1 text-sm text-ink-muted">
            <p>{correctCount} correct ({pct}%)</p>
            <p className="text-wrong">−{lifelineCost} lifeline cost</p>
          </div>
        ) : (
          <p className="text-ink-muted mt-3">{pct}% correct</p>
        )}
      </div>

      {isNewBest && (
        <p className="text-highlight text-sm font-medium">🎉 New high score!</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button onClick={onReplay}>Play again</Button>
        <Link to="/setup">
          <Button variant="secondary">Change filters</Button>
        </Link>
      </div>
    </BorderContainer>
  );
}