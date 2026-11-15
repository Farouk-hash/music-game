// music-game-wrangler/src/routes/round.js
import { getRoundDynamic } from "../../controllers/game/round-dynamic.js";
import { getRoundMultiplayer } from "../../controllers/game/round-multiplayer.js";
import { getRoundMulti } from "../../controllers/game/round-mutli.js";
import { getRoundSet } from "../../controllers/game/round-sets.js";
import { getRound } from "../../controllers/game/rounds.js";

export const roundRoutes = [
  { method: 'POST', pattern: /^\/game\/round$/, handler: (r, e) => getRound(r, e) },
  { method: 'POST', pattern: /^\/game\/round-multi$/, handler: (r, e) => getRoundMulti(r, e) },
  { method: 'POST', pattern: /^\/game\/round-set$/, handler: (r, e) => getRoundSet(r, e) },
  { method: 'POST', pattern: /^\/game\/round-multiplayer$/, handler: (r, e) => getRoundMultiplayer(r, e) },
  { method: 'POST', pattern: /^\/game\/round-dynamic$/, handler: getRoundDynamic },

];