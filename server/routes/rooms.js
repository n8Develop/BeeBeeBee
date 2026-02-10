import { Router } from 'express';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import {
  createRoom,
  findRoomById,
  findRoomByInviteCode,
  deleteRoom,
  addRoomMember,
  removeRoomMember,
  isRoomMember,
  getRoomMembers,
  getRoomMemberCount,
  getUserRooms,
  getUserRoomCount
} from '../db/queries.js';

const router = Router();

function sanitizeRoom(room) {
  const { password_hash, ...rest } = room;
  return rest;
}

// POST /api/rooms — Create a room
router.post('/', requireAuth, (req, res) => {
  const { name, password } = req.body;

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

    createRoom.run(id, name.trim(), req.user.id, password_hash, invite_code);
    addRoomMember.run(id, req.user.id);

    const room = findRoomById.get(id);
    res.status(201).json(sanitizeRoom(room));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/rooms — List my rooms
router.get('/', requireAuth, (req, res) => {
  try {
    const rooms = getUserRooms.all(req.user.id);
    res.json(rooms.map(sanitizeRoom));
  } catch {
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
  } catch {
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
  } catch {
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

    // Check room capacity
    const count = getRoomMemberCount.get(req.params.id);
    if (count.count >= room.max_members) {
      return res.status(400).json({ error: 'This room is full' });
    }

    // Check user room limit
    const userCount = getUserRoomCount.get(req.user.id);
    if (userCount.count >= 20) {
      return res.status(400).json({ error: 'You have reached the maximum of 20 rooms' });
    }

    // Check password
    if (room.password_hash) {
      if (!password || !bcrypt.compareSync(password, room.password_hash)) {
        return res.status(403).json({ error: 'Incorrect room password' });
      }
    }

    addRoomMember.run(req.params.id, req.user.id);
    res.json(sanitizeRoom(room));
  } catch {
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

    // Check room capacity
    const count = getRoomMemberCount.get(room.id);
    if (count.count >= room.max_members) {
      return res.status(400).json({ error: 'This room is full' });
    }

    // Check user room limit
    const userCount = getUserRoomCount.get(req.user.id);
    if (userCount.count >= 20) {
      return res.status(400).json({ error: 'You have reached the maximum of 20 rooms' });
    }

    // Check password
    if (room.password_hash) {
      if (!password || !bcrypt.compareSync(password, room.password_hash)) {
        return res.status(403).json({ error: 'Incorrect room password' });
      }
    }

    addRoomMember.run(room.id, req.user.id);
    res.json(sanitizeRoom(room));
  } catch {
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
  } catch {
    return res.status(500).json({ error: 'Failed to leave room' });
  }
});

export default router;
