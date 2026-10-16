// E:\matb3aa-game\host-sporcle-wrangler\src\index.js
import { route } from './router.js';

export { HostSporcle } from './controllers/host-sporcle.js';

export default {
  async fetch(request, env, ctx) {
    return route(request, env, ctx);
  },
};