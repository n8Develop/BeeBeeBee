const store = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const AUTH_MAX = 5;
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/request-reset'];

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}, WINDOW_MS);

export function httpRateLimit(req, res, next) {
  if (req.method === 'GET') return next();

  const ip = req.ip;
  const isAuth = AUTH_PATHS.includes(req.path);
  const key = isAuth ? `auth:${ip}` : `gen:${ip}`;
  const limit = isAuth ? AUTH_MAX : MAX_REQUESTS;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;
  if (entry.count > limit) {
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }

  next();
}
