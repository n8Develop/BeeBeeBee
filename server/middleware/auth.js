import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { findUserById } from '../db/queries.js';

export function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = findUserById.get(payload.id);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}
