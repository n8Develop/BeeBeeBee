import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { validateImage } from '../uploads/validate.js';

const router = Router();

const UPLOADS_DIR = path.resolve('uploads/messages');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

// POST /api/upload — Upload an image
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const { valid, ext } = validateImage(req.file.buffer);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid file type or size. Only PNG, JPG, GIF, and WebP under 2MB are allowed' });
  }

  try {
    const filename = `${nanoid()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    res.json({ url: `/uploads/messages/${filename}` });
  } catch (err) {
    console.error('Image upload failed:', err.message);
    return res.status(500).json({ error: 'Failed to save image' });
  }
});

export default router;
