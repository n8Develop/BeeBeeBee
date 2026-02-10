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
