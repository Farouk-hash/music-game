// music-game-wrangler/src/routes/invites.js
import {
  sendInvites,
  listPendingInvites,
  listRoomInvites,
  dismissInvite,
  cleanupRoomInvites,
} from '../controllers/invites/invites';

export const inviteRoutes = [
  { method: 'GET',  pattern: /^\/invites\/pending$/, handler: listPendingInvites },
  { method: 'GET',  pattern: /^\/invites\/room$/,    handler: listRoomInvites },
  { method: 'POST', pattern: /^\/invites\/dismiss$/, handler: dismissInvite },
  { method: 'POST', pattern: /^\/invites\/cleanup-room$/, handler: cleanupRoomInvites },
  { method: 'POST', pattern: /^\/invites$/,          handler: sendInvites },
];