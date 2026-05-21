import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import memoriesRoutes from './routes/memories.js';
import sessionsRoutes from './routes/sessions.js';
import { authMiddleware } from './middleware/auth.js';
import { getDb, closeDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/memories', authMiddleware, memoriesRoutes);
app.use('/api/sessions', authMiddleware, sessionsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: { message: '服务器内部错误' } });
});

const server = app.listen(PORT, async () => {
  await getDb();
  console.log(`莉雅后端已启动 → http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  closeDb();
  server.close();
  process.exit(0);
});
