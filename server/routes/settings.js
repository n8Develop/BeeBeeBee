import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { validateImage } from '../uploads/validate.js';
import {
  updateUserAvatar,
  updateUserPassword,
  findUserById,
  updateUserEmail,
  checkEmailTaken,
  getUserSettings,
  upsertUserSettings,
  deleteVerificationTokensByUser,
  createVerificationToken,
} from '../db/queries.js';
import { sendVerificationEmail } from '../email/index.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// PUT /api/settings/avatar — Upload avatar
router.put('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.user.email_verified) {
    return res.status(403).json({ error: 'Email must be verified to upload an avatar' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { valid } = validateImage(req.file.buffer);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid image file. Supported: PNG, JPG, GIF, WebP' });
  }

  try {
    const avatarsDir = path.resolve('uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const filename = `${req.user.id}.png`;
    const filepath = path.join(avatarsDir, filename);

    await sharp(req.file.buffer)
      .resize(128, 128, { fit: 'cover' })
      .png()
      .toFile(filepath);

    const avatarUrl = `/uploads/avatars/${filename}`;
    updateUserAvatar.run(avatarUrl, req.user.id);

    res.json({ avatarUrl });
  } catch {
    return res.status(500).json({ error: 'Failed to process avatar' });
  }
});

// PUT /api/settings/password — Change password
router.put('/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: 'New password must be 8-128 characters' });
  }

  const user = findUserById.get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(403).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  updateUserPassword.run(hash, req.user.id);

  res.json({ ok: true });
});

// PUT /api/settings/email — Update email
router.put('/email', requireAuth, async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const taken = checkEmailTaken.get(email, req.user.id);
  if (taken) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  updateUserEmail.run(email, req.user.id);

  // Send verification email
  deleteVerificationTokensByUser.run(req.user.id);
  const token = crypto.randomBytes(32).toString('hex');
  createVerificationToken.run(req.user.id, token);
  await sendVerificationEmail(req.user.username, email, token);

  res.json({ ok: true });
});

// PUT /api/settings/sound — Update sound settings
router.put('/sound', requireAuth, (req, res) => {
  const { inputVolume, sendVolume, notificationVolume, masterVolume } = req.body;

  const clamp = (v) => Math.max(0, Math.min(100, typeof v === 'number' ? v : 100));

  upsertUserSettings.run(
    req.user.id,
    clamp(inputVolume),
    clamp(sendVolume),
    clamp(notificationVolume),
    clamp(masterVolume)
  );

  res.json({ ok: true });
});

// GET /api/settings/sound — Get sound settings
router.get('/sound', requireAuth, (req, res) => {
  const settings = getUserSettings.get(req.user.id);

  if (!settings) {
    return res.json({
      inputVolume: 100,
      sendVolume: 100,
      notificationVolume: 100,
      masterVolume: 100,
    });
  }

  res.json({
    inputVolume: settings.input_volume,
    sendVolume: settings.send_volume,
    notificationVolume: settings.notification_volume,
    masterVolume: settings.master_volume,
  });
});

export default router;
