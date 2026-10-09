
import { getRoundMultiplayer } from "../../controllers/game/round-multiplayer";
import { getRoundMulti } from "../../controllers/game/round-mutli";
import { getRoundSet } from "../../controllers/game/round-sets";
import { getRound } from "../../controllers/game/rounds";

export const roundRoutes = [
  { method: 'GET', pattern: /^\/game\/round$/,   handler: (r, e) => getRound(r, e) },
  { method: 'GET', pattern: /^\/game\/round-multi$/, handler: (r, e) => getRoundMulti(r, e) },
  { method: 'GET', pattern: /^\/game\/round-set$/,   handler: (r, e) => getRoundSet(r, e) },
  { method: 'GET', pattern: /^\/game\/round-multiplayer$/, handler: (r, e) => getRoundMultiplayer(r, e) },
];