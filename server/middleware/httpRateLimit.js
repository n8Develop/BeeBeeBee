const store = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const AUTH_MAX = 5;
const GET_MAX = 60;
const MAX_STORE_SIZE = 10_000;
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/request-reset'];

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}, WINDOW_MS);

// Allow graceful shutdown
cleanupTimer.unref?.();

export function httpRateLimit(req, res, next) {
  const ip = req.ip;
  const isAuth = AUTH_PATHS.includes(req.path);
  const isGet = req.method === 'GET';
  const key = isAuth ? `auth:${ip}` : isGet ? `get:${ip}` : `gen:${ip}`;
  const limit = isAuth ? AUTH_MAX : isGet ? GET_MAX : MAX_REQUESTS;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    // Evict oldest entries if store is too large
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value;
      store.delete(firstKey);
    }
    entry = { count: 0, resetTime: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const resetSecs = Math.ceil((entry.resetTime - now) / 1000);
  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(remaining));
  res.setHeader('RateLimit-Reset', String(resetSecs));

  if (entry.count > limit) {
    res.setHeader('Retry-After', String(resetSecs));
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }

  next();
}
