import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { updateUserEmail, checkEmailTaken, createVerificationToken, findVerificationToken, deleteVerificationTokensByUser, verifyUserEmail, findUserById } from '../db/queries.js';
import { sendVerificationEmail } from '../email/index.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/email/add
router.post('/add', requireAuth, (req, res) => {
  const { email } = req.body;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const taken = checkEmailTaken.get(email, req.user.id);
  if (taken) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  updateUserEmail.run(email, req.user.id);
  deleteVerificationTokensByUser.run(req.user.id);

  const token = crypto.randomBytes(32).toString('hex');
  createVerificationToken.run(req.user.id, token);

  sendVerificationEmail(req.user.username, email, token);

  res.json({ ok: true });
});

// POST /api/email/verify
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const record = findVerificationToken.get(token);
  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired verification token' });
  }

  verifyUserEmail.run(record.user_id);
  deleteVerificationTokensByUser.run(record.user_id);

  res.json({ ok: true });
});

export default router;
