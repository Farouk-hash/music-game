// music-game-wrangler/src/routes/game/rounds.js
import { getRoundDynamic } from "../../controllers/game/round-dynamic.js";
import { getRoundMultiplayer } from "../../controllers/game/round-multiplayer.js";
import { getRoundMulti } from "../../controllers/game/round-mutli.js";
import { getRoundSet } from "../../controllers/game/round-sets.js";
import { getRound } from "../../controllers/game/rounds.js";

export const roundRoutes = [
  { method: 'POST', pattern: /^\/game\/round$/,           handler: getRound },
  { method: 'POST', pattern: /^\/game\/round-multi$/,     handler: getRoundMulti },
  { method: 'POST', pattern: /^\/game\/round-set$/,       handler: getRoundSet },
  { method: 'POST', pattern: /^\/game\/round-multiplayer$/, handler: getRoundMultiplayer },
  { method: 'POST', pattern: /^\/game\/round-dynamic$/,   handler: getRoundDynamic },
];