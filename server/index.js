import express from 'express';
import { createServer } from 'http';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import './db/index.js';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';
import roomRoutes from './routes/rooms.js';
import uploadRoutes from './routes/upload.js';
import friendsRoutes from './routes/friends.js';
import settingsRoutes from './routes/settings.js';
import { initSocket } from './socket/index.js';
import { startCleanupInterval } from './uploads/cleanup.js';
import { httpRateLimit } from './middleware/httpRateLimit.js';

const app = express();
const server = createServer(app);

// Trust first proxy (nginx, Cloudflare, etc.) for correct req.ip
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

initSocket(server);

app.use(compression());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (config.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'");
  }
  next();
});
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(httpRateLimit);
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);

app.use('/api/rooms', roomRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/settings', settingsRoutes);

if (config.NODE_ENV === 'production') {
  const buildDir = new URL('../build', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  app.use(express.static(buildDir, { maxAge: '1y', immutable: true }));
  app.get('/{*path}', (req, res) => res.sendFile('200.html', { root: buildDir }));
}

startCleanupInterval();

server.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});

export { app, server };
