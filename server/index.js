import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import './db/index.js';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';
import roomRoutes from './routes/rooms.js';
import uploadRoutes from './routes/upload.js';
import { initSocket } from './socket/index.js';
import { startCleanupInterval } from './uploads/cleanup.js';

const app = express();
const server = createServer(app);

initSocket(server);

app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);

app.use('/api/rooms', roomRoutes);
app.use('/api/upload', uploadRoutes);

startCleanupInterval();

server.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});

export { app, server };
