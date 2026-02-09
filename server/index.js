import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import './db/index.js';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';

const app = express();

app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);

app.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});

export default app;
