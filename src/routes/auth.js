import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, stmt } from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  const db = await getDb();
  const existing = stmt('SELECT COUNT(*) as cnt FROM user').get();
  if (existing.cnt > 0) {
    return res.status(400).json({ error: { message: '已注册过，如需重置请联系管理员' } });
  }

  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: { message: '用户名不能为空，密码至少6位' } });
  }

  const hash = await bcrypt.hash(password, 12);
  stmt('INSERT INTO user (username, password_hash) VALUES (?, ?)').run(username, hash);

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: { message: '用户名和密码不能为空' } });
  }

  await getDb();
  const user = stmt('SELECT * FROM user WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: { message: '用户名或密码错误' } });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: { message: '用户名或密码错误' } });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username });
});

export default router;
