// music-game-wrangler/src/routes/follows.js
import {
  sendRequest,
  acceptRequest,
  declineRequest,
  unfollow,
  listFriends,
  listPending,
  getStatus,
} from '../controllers/follows/follows.js';

export const followRoutes = [
  // Specific paths first — same principle as profiles.js.
  { method: 'GET',    pattern: /^\/follows\/friends$/, handler: listFriends },
  { method: 'GET',    pattern: /^\/follows\/pending$/, handler: listPending },
  { method: 'GET',    pattern: /^\/follows\/status$/,  handler: getStatus },

  { method: 'POST',   pattern: /^\/follows\/accept$/,  handler: acceptRequest },
  { method: 'POST',   pattern: /^\/follows\/decline$/, handler: declineRequest },

  { method: 'POST',   pattern: /^\/follows$/,          handler: sendRequest },
  { method: 'DELETE', pattern: /^\/follows$/,          handler: unfollow },
];