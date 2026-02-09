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
