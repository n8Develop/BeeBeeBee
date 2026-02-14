import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../db/index.js';
import {
  findUserByUsername,
  findUserById,
  createFriendRequest,
  getFriendship,
  updateFriendshipStatus,
  deleteFriendship,
  getIncomingRequests,
  getOutgoingRequests,
  getFriendsList,
  getBlockedByUser,
  isBlocked,
} from '../db/queries.js';
import { getMultipleOnlineStatus, cacheBlockList } from '../redis/presence.js';
import { getIo } from '../socket/io.js';

const router = Router();

// POST /api/friends/request — Send a friend request
router.post('/request', requireAuth, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const target = findUserByUsername.get(username);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
  }

  // Check for existing relationship in either direction
  const existing = getFriendship.get(req.user.id, target.id);
  const reverse = getFriendship.get(target.id, req.user.id);

  if (existing || reverse) {
    if ((existing && existing.status === 'blocked') || (reverse && reverse.status === 'blocked')) {
      return res.status(400).json({ error: 'Cannot send request to this user' });
    }
    if ((existing && existing.status === 'accepted') || (reverse && reverse.status === 'accepted')) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }
    if ((existing && existing.status === 'pending') || (reverse && reverse.status === 'pending')) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }
  }

  createFriendRequest.run(req.user.id, target.id, 'pending');

  // Emit to target's personal room
  const io = getIo();
  if (io) {
    io.to(`user:${target.id}`).emit('friend:request-received', {
      fromUserId: req.user.id,
      fromUsername: req.user.username,
    });
  }

  res.status(201).json({ ok: true });
});

// GET /api/friends/requests — Get incoming and outgoing requests
router.get('/requests', requireAuth, (req, res) => {
  const incoming = getIncomingRequests.all(req.user.id);
  const outgoing = getOutgoingRequests.all(req.user.id);
  res.json({ incoming, outgoing });
});

// POST /api/friends/accept — Accept a friend request
router.post('/accept', requireAuth, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  // Must have an incoming pending request (userId -> me)
  const request = getFriendship.get(userId, req.user.id);
  if (!request || request.status !== 'pending') {
    return res.status(400).json({ error: 'No pending friend request from this user' });
  }

  // Update the original request to accepted
  updateFriendshipStatus.run('accepted', userId, req.user.id);
  // Insert the reverse direction
  createFriendRequest.run(req.user.id, userId, 'accepted');

  const io = getIo();
  if (io) {
    const sender = findUserById.get(userId);
    // Notify both parties
    io.to(`user:${userId}`).emit('friend:request-accepted', {
      userId: req.user.id,
      username: req.user.username,
    });
    io.to(`user:${req.user.id}`).emit('friend:request-accepted', {
      userId: userId,
      username: sender ? sender.username : 'Unknown',
    });
  }

  res.json({ ok: true });
});

// POST /api/friends/decline — Decline a friend request
router.post('/decline', requireAuth, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const request = getFriendship.get(userId, req.user.id);
  if (!request || request.status !== 'pending') {
    return res.status(400).json({ error: 'No pending friend request from this user' });
  }

  deleteFriendship.run(userId, req.user.id);
  res.json({ ok: true });
});

// DELETE /api/friends/:userId — Remove a friend
router.delete('/:userId', requireAuth, (req, res) => {
  const friendId = parseInt(req.params.userId, 10);
  if (isNaN(friendId)) return res.status(400).json({ error: 'Invalid userId' });

  // Delete both directions
  deleteFriendship.run(req.user.id, friendId);
  deleteFriendship.run(friendId, req.user.id);

  res.json({ ok: true });
});

// POST /api/friends/block — Block a user
router.post('/block', requireAuth, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot block yourself' });
  }

  // Atomically delete friendships and insert block
  const blocked = db.transaction(() => {
    deleteFriendship.run(req.user.id, userId);
    deleteFriendship.run(userId, req.user.id);
    createFriendRequest.run(req.user.id, userId, 'blocked');
    return getBlockedByUser.all(req.user.id).map((r) => r.friend_id);
  })();

  // Update Redis block cache
  await cacheBlockList(req.user.id, blocked);

  res.json({ ok: true });
});

// GET /api/friends — Get friends list with online status
router.get('/', requireAuth, async (req, res) => {
  const friends = getFriendsList.all(req.user.id);
  const userIds = friends.map((f) => f.userId);
  const onlineStatus = await getMultipleOnlineStatus(userIds);

  const result = friends.map((f) => ({
    userId: f.userId,
    username: f.username,
    avatarUrl: f.avatarUrl || null,
    online: !!onlineStatus[f.userId],
  }));

  res.json(result);
});

export default router;
