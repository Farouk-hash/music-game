import { getCatalog } from "../../controllers/game/catalog";

export const catalogRoutes = [
  { method: 'GET', pattern: /^\/game\/catalog$/, handler: (r, e) => getCatalog(r, e) },
];