import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve('uploads/messages');
const MAX_AGE_MS = 50 * 60 * 60 * 1000; // 50 hours
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function cleanupOldFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) return;

  const now = Date.now();
  const files = fs.readdirSync(UPLOADS_DIR);

  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Cleanup: failed to process ${file}:`, err.message);
    }
  }
}

export function startCleanupInterval() {
  cleanupOldFiles();
  setInterval(cleanupOldFiles, INTERVAL_MS);
}
