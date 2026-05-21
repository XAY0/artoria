import { Router } from 'express';
import { getDb, stmt } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  await getDb();
  const sessions = stmt(
    `SELECT s.id, s.title, s.created_at, s.updated_at,
            (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as msg_count
     FROM sessions s ORDER BY s.updated_at DESC`
  ).all();
  res.json({ sessions });
});

router.post('/', async (req, res) => {
  await getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const title = (req.body.title || '新的对话').slice(0, 100);
  stmt("INSERT INTO sessions (id, title) VALUES (?, ?)").run(id, title);
  res.status(201).json({ id, title, messages: [] });
});

router.get('/:id', async (req, res) => {
  await getDb();
  const session = stmt("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: { message: '会话不存在' } });
  }
  const messages = stmt(
    "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC"
  ).all(req.params.id);
  res.json({ ...session, messages });
});

router.delete('/:id', async (req, res) => {
  await getDb();
  stmt("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
