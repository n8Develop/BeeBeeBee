import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import { createUser, findUserByUsername, findUserByEmail, findUserById, updateUserPassword, createResetToken, findResetToken, deleteResetTokensByUser } from '../db/queries.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../email/index.js';

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

function setTokenCookie(res, user) {
  const token = jwt.sign({ id: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE_OPTS);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    emailVerified: !!user.email_verified
  };
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores)' });
  }
  if (!password || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 8-128 characters' });
  }

  const existing = findUserByUsername.get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = createUser.run(username, hash);
  const user = findUserById.get(result.lastInsertRowid);

  setTokenCookie(res, user);
  res.status(201).json(sanitizeUser(user));
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = findUserByUsername.get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  setTokenCookie(res, user);
  res.json(sanitizeUser(user));
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(sanitizeUser(req.user));
});

// POST /api/auth/request-reset
router.post('/request-reset', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Always return the same response to prevent enumeration
  const generic = { ok: true, message: 'If an account exists with that email, we sent a reset link' };

  const user = findUserByEmail.get(email);
  if (!user) return res.json(generic);

  deleteResetTokensByUser.run(user.id);
  const token = crypto.randomBytes(32).toString('hex');
  createResetToken.run(user.id, token);

  sendPasswordResetEmail(user.username, user.email, token);

  res.json(generic);
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password required' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 8-128 characters' });
  }

  const record = findResetToken.get(token);
  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const hash = bcrypt.hashSync(password, 10);
  updateUserPassword.run(hash, record.user_id);
  deleteResetTokensByUser.run(record.user_id);

  res.json({ ok: true });
});

export default router;
