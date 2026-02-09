import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};
