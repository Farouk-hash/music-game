// game/src/lib/storage.js
//
// localStorage helpers. Used for the player's display name and the
// local high score. No backend involved — deliberately.

const KEYS = {
  playerName: 'game.playerName',
  highScore:  'game.highScore',
};

export const storage = {
  getPlayerName() {
    try { return localStorage.getItem(KEYS.playerName) ?? ''; }
    catch { return ''; }
  },
  setPlayerName(name) {
    try { localStorage.setItem(KEYS.playerName, name); } catch {}
  },
  clearPlayerName() {
    try { localStorage.removeItem(KEYS.playerName); } catch {}
  },

  getHighScore() {
    try {
      const v = localStorage.getItem(KEYS.highScore);
      return v == null ? 0 : Number(v) || 0;
    } catch { return 0; }
  },
  setHighScore(score) {
    try { localStorage.setItem(KEYS.highScore, String(score)); } catch {}
  },
};