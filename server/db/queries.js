import db from './index.js';

export const createUser = db.prepare(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);

export const findUserByUsername = db.prepare(
  'SELECT * FROM users WHERE username = ?'
);

export const findUserById = db.prepare(
  'SELECT * FROM users WHERE id = ?'
);

export const findUserByEmail = db.prepare(
  'SELECT * FROM users WHERE email = ? AND email_verified = 1'
);

export const updateUserEmail = db.prepare(
  'UPDATE users SET email = ?, email_verified = 0, updated_at = datetime(\'now\') WHERE id = ?'
);

export const verifyUserEmail = db.prepare(
  'UPDATE users SET email_verified = 1, updated_at = datetime(\'now\') WHERE id = ?'
);

export const updateUserPassword = db.prepare(
  'UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
);

// Email verification tokens
export const createVerificationToken = db.prepare(
  'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, datetime(\'now\', \'+24 hours\'))'
);

export const findVerificationToken = db.prepare(
  'SELECT * FROM email_verification_tokens WHERE token = ? AND expires_at > datetime(\'now\')'
);

export const deleteVerificationTokensByUser = db.prepare(
  'DELETE FROM email_verification_tokens WHERE user_id = ?'
);

// Password reset tokens
export const createResetToken = db.prepare(
  'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, datetime(\'now\', \'+1 hours\'))'
);

export const findResetToken = db.prepare(
  'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime(\'now\')'
);

export const deleteResetTokensByUser = db.prepare(
  'DELETE FROM password_reset_tokens WHERE user_id = ?'
);

export const checkEmailTaken = db.prepare(
  'SELECT id FROM users WHERE email = ? AND id != ?'
);

// Room queries
export const createRoom = db.prepare(
  'INSERT INTO rooms (id, name, owner_id, password_hash, invite_code) VALUES (?, ?, ?, ?, ?)'
);

export const findRoomById = db.prepare(
  'SELECT * FROM rooms WHERE id = ?'
);

export const findRoomByInviteCode = db.prepare(
  'SELECT * FROM rooms WHERE invite_code = ?'
);

export const deleteRoom = db.prepare(
  'DELETE FROM rooms WHERE id = ?'
);

export const addRoomMember = db.prepare(
  'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)'
);

export const removeRoomMember = db.prepare(
  'DELETE FROM room_members WHERE room_id = ? AND user_id = ?'
);

export const isRoomMember = db.prepare(
  'SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?'
);

export const getRoomMembers = db.prepare(
  `SELECT u.id, u.username, rm.joined_at
   FROM room_members rm
   JOIN users u ON u.id = rm.user_id
   WHERE rm.room_id = ?`
);

export const getRoomMemberCount = db.prepare(
  'SELECT COUNT(*) as count FROM room_members WHERE room_id = ?'
);

export const getUserRooms = db.prepare(
  `SELECT r.*, rm.joined_at
   FROM rooms r
   JOIN room_members rm ON rm.room_id = r.id
   WHERE rm.user_id = ?`
);

export const getUserRoomCount = db.prepare(
  'SELECT COUNT(*) as count FROM room_members WHERE user_id = ?'
);

// Room type queries
export const createRoomWithType = db.prepare(
  'INSERT INTO rooms (id, name, owner_id, password_hash, invite_code, max_members, type) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

export const searchNamedRooms = db.prepare(
  `SELECT r.*, (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
   FROM rooms r WHERE r.type = 'named' AND r.name LIKE ?
   LIMIT 20`
);

export const findDirectRoom = db.prepare(
  `SELECT r.id FROM rooms r
   JOIN room_members rm1 ON rm1.room_id = r.id AND rm1.user_id = ?
   JOIN room_members rm2 ON rm2.room_id = r.id AND rm2.user_id = ?
   WHERE r.type = 'direct'
   LIMIT 1`
);

// Friendship queries
export const createFriendRequest = db.prepare(
  'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)'
);

export const getFriendship = db.prepare(
  'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?'
);

export const updateFriendshipStatus = db.prepare(
  'UPDATE friendships SET status = ? WHERE user_id = ? AND friend_id = ?'
);

export const deleteFriendship = db.prepare(
  'DELETE FROM friendships WHERE user_id = ? AND friend_id = ?'
);

export const getIncomingRequests = db.prepare(
  `SELECT f.user_id as userId, u.username
   FROM friendships f
   JOIN users u ON u.id = f.user_id
   WHERE f.friend_id = ? AND f.status = 'pending'`
);

export const getOutgoingRequests = db.prepare(
  `SELECT f.friend_id as userId, u.username
   FROM friendships f
   JOIN users u ON u.id = f.friend_id
   WHERE f.user_id = ? AND f.status = 'pending'`
);

export const getFriendsList = db.prepare(
  `SELECT f.friend_id as userId, u.username, u.avatar_url as avatarUrl
   FROM friendships f
   JOIN users u ON u.id = f.friend_id
   WHERE f.user_id = ? AND f.status = 'accepted'`
);

export const getBlockedByUser = db.prepare(
  `SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'blocked'`
);

export const getBlockedUsers = db.prepare(
  `SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'blocked'`
);

export const isBlocked = db.prepare(
  `SELECT 1 FROM friendships
   WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
   AND status = 'blocked'`
);

// Avatar query
export const updateUserAvatar = db.prepare(
  "UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
);

// User settings queries
export const getUserSettings = db.prepare(
  'SELECT * FROM user_settings WHERE user_id = ?'
);

export const upsertUserSettings = db.prepare(
  `INSERT INTO user_settings (user_id, input_volume, send_volume, notification_volume, master_volume)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(user_id) DO UPDATE SET
     input_volume = excluded.input_volume,
     send_volume = excluded.send_volume,
     notification_volume = excluded.notification_volume,
     master_volume = excluded.master_volume`
);
