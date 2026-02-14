import { Router } from 'express';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import db from '../db/index.js';
import {
  createRoom,
  createRoomWithType,
  findRoomById,
  findRoomByInviteCode,
  deleteRoom,
  addRoomMember,
  removeRoomMember,
  isRoomMember,
  getRoomMembers,
  getRoomMemberCount,
  getUserRooms,
  getUserRoomCount,
  searchNamedRooms,
  findDirectRoom,
  getFriendship,
  findUserById,
} from '../db/queries.js';

const router = Router();

function sanitizeRoom(room) {
  const { password_hash, member_count, invite_code, owner_id, max_members, created_at, ...rest } = room;
  const result = {
    ...rest,
    inviteCode: invite_code,
    ownerId: owner_id,
    maxMembers: max_members,
    createdAt: created_at,
    hasPassword: !!password_hash,
  };
  if (member_count != null) result.memberCount = member_count;
  return result;
}

// POST /api/rooms — Create a room
router.post('/', requireAuth, (req, res) => {
  const { name, password, type } = req.body;
  const roomType = type || 'invite';

  if (!['invite', 'named', 'direct'].includes(roomType)) {
    return res.status(400).json({ error: 'Invalid room type' });
  }

  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
    return res.status(400).json({ error: 'Room name must be 1-50 characters' });
  }

  const roomCount = getUserRoomCount.get(req.user.id);
  if (roomCount.count >= 20) {
    return res.status(400).json({ error: 'You have reached the maximum of 20 rooms' });
  }

  try {
    const id = nanoid();
    const invite_code = nanoid(10);
    const password_hash = password ? bcrypt.hashSync(password, 10) : null;

    if (roomType === 'named') {
      createRoomWithType.run(id, name.trim(), req.user.id, password_hash, invite_code, 16, 'named');
    } else {
      createRoom.run(id, name.trim(), req.user.id, password_hash, invite_code);
    }

    addRoomMember.run(id, req.user.id);

    const room = findRoomById.get(id);
    res.status(201).json(sanitizeRoom(room));
  } catch (err) {
    console.error(`Room create failed for user ${req.user.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/rooms/browse — Search named rooms
router.get('/browse', requireAuth, (req, res) => {
  const q = req.query.q || '';
  try {
    const rooms = searchNamedRooms.all(`%${q}%`);
    res.json(rooms.map(sanitizeRoom));
  } catch (err) {
    console.error('Room browse failed:', err.message);
    return res.status(500).json({ error: 'Failed to search rooms' });
  }
});

// POST /api/rooms/direct — Create or find a direct message room
router.post('/direct', requireAuth, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'friendId is required' });

  // Check friendship exists (either direction must be accepted)
  const friendship = getFriendship.get(req.user.id, friendId);
  const reverseFriendship = getFriendship.get(friendId, req.user.id);
  const isFriend = (friendship && friendship.status === 'accepted') ||
                   (reverseFriendship && reverseFriendship.status === 'accepted');

  if (!isFriend) {
    return res.status(403).json({ error: 'You can only create direct rooms with friends' });
  }

  try {
    // Use a transaction to prevent duplicate direct rooms
    const result = db.transaction(() => {
      const existing = findDirectRoom.get(req.user.id, friendId);
      if (existing) {
        return { existing: true, room: findRoomById.get(existing.id) };
      }

      const friendUser = findUserById.get(friendId);
      const roomName = `${req.user.username} & ${friendUser ? friendUser.username : 'Unknown'}`;

      const id = nanoid();
      const invite_code = nanoid(10);
      createRoomWithType.run(id, roomName, req.user.id, null, invite_code, 2, 'direct');
      addRoomMember.run(id, req.user.id);
      addRoomMember.run(id, friendId);

      return { existing: false, room: findRoomById.get(id) };
    })();

    if (result.existing) {
      return res.json(sanitizeRoom(result.room));
    }
    res.status(201).json(sanitizeRoom(result.room));
  } catch (err) {
    console.error(`Direct room create failed for user ${req.user.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to create direct room' });
  }
});

// GET /api/rooms — List my rooms
router.get('/', requireAuth, (req, res) => {
  try {
    const rooms = getUserRooms.all(req.user.id);
    res.json(rooms.map(sanitizeRoom));
  } catch (err) {
    console.error(`Room list failed for user ${req.user.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/rooms/:id — Room details (members only)
router.get('/:id', requireAuth, (req, res) => {
  try {
    const room = findRoomById.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const member = isRoomMember.get(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    const members = getRoomMembers.all(req.params.id);
    res.json({ ...sanitizeRoom(room), members });
  } catch (err) {
    console.error(`Room detail failed for room ${req.params.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// DELETE /api/rooms/:id — Delete room (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const room = findRoomById.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the room owner can delete this room' });
    }

    deleteRoom.run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(`Room delete failed for room ${req.params.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to delete room' });
  }
});

// POST /api/rooms/:id/join — Join room by ID
router.post('/:id/join', requireAuth, (req, res) => {
  const { password } = req.body;

  try {
    const room = findRoomById.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Already a member?
    const existing = isRoomMember.get(req.params.id, req.user.id);
    if (existing) return res.json(sanitizeRoom(room));

    // Check password before transaction
    if (room.password_hash) {
      if (!password || !bcrypt.compareSync(password, room.password_hash)) {
        return res.status(403).json({ error: 'Incorrect room password' });
      }
    }

    // Transaction for atomic capacity check + join
    const result = db.transaction(() => {
      const count = getRoomMemberCount.get(req.params.id);
      if (count.count >= room.max_members) return { error: 'This room is full' };

      const userCount = getUserRoomCount.get(req.user.id);
      if (userCount.count >= 20) return { error: 'You have reached the maximum of 20 rooms' };

      addRoomMember.run(req.params.id, req.user.id);
      return null;
    })();

    if (result) return res.status(400).json(result);
    res.json(sanitizeRoom(room));
  } catch (err) {
    console.error(`Room join failed for user ${req.user.id}, room ${req.params.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to join room' });
  }
});

// POST /api/rooms/join-by-code — Join room by invite code
router.post('/join-by-code', requireAuth, (req, res) => {
  const { inviteCode, password } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    const room = findRoomByInviteCode.get(inviteCode);
    if (!room) return res.status(404).json({ error: 'Invalid invite code' });

    // Already a member?
    const existing = isRoomMember.get(room.id, req.user.id);
    if (existing) return res.json(sanitizeRoom(room));

    // Check password before transaction
    if (room.password_hash) {
      if (!password || !bcrypt.compareSync(password, room.password_hash)) {
        return res.status(403).json({ error: 'Incorrect room password' });
      }
    }

    // Transaction for atomic capacity check + join
    const result = db.transaction(() => {
      const count = getRoomMemberCount.get(room.id);
      if (count.count >= room.max_members) return { error: 'This room is full' };

      const userCount = getUserRoomCount.get(req.user.id);
      if (userCount.count >= 20) return { error: 'You have reached the maximum of 20 rooms' };

      addRoomMember.run(room.id, req.user.id);
      return null;
    })();

    if (result) return res.status(400).json(result);
    res.json(sanitizeRoom(room));
  } catch (err) {
    console.error(`Room join-by-code failed for user ${req.user.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to join room' });
  }
});

// POST /api/rooms/:id/leave — Leave room
router.post('/:id/leave', requireAuth, (req, res) => {
  try {
    const room = findRoomById.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const member = isRoomMember.get(req.params.id, req.user.id);
    if (!member) return res.status(400).json({ error: 'Not a member of this room' });

    // Owner leaving deletes the room
    if (room.owner_id === req.user.id) {
      deleteRoom.run(req.params.id);
      return res.json({ ok: true, deleted: true });
    }

    removeRoomMember.run(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(`Room leave failed for user ${req.user.id}, room ${req.params.id}:`, err.message);
    return res.status(500).json({ error: 'Failed to leave room' });
  }
});

export default router;
