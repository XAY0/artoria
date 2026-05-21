import { Router } from 'express';
import { getDb, stmt } from '../db.js';

const router = Router();

function getSystemPrompt() {
  const mem = stmt("SELECT content FROM memories WHERE type = 'personality' ORDER BY updated_at DESC LIMIT 1").get();
  return mem ? mem.content : '';
}

router.post('/', async (req, res) => {
  const { sessionId, message, system: clientSystem } = req.body;
  if (!message) {
    return res.status(400).json({ error: { message: '消息不能为空' } });
  }

  await getDb();
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/anthropic').replace(/\/$/, '');
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

  if (!apiKey) {
    return res.status(500).json({ error: { message: '服务器未配置 API Key' } });
  }

  let sid = sessionId;
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    stmt("INSERT INTO sessions (id, title) VALUES (?, ?)").run(sid, message.slice(0, 30));
  } else {
    const existing = stmt("SELECT id FROM sessions WHERE id = ?").get(sid);
    if (!existing) {
      stmt("INSERT INTO sessions (id, title) VALUES (?, ?)").run(sid, message.slice(0, 30));
    }
  }

  stmt("INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)").run(sid, message);

  const history = stmt(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 50"
  ).all(sid);

  const system = clientSystem || getSystemPrompt();
  const messages = history.map(m => ({ role: m.role, content: m.content }));

  try {
    const url = `${baseUrl}/v1/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.8,
        system: system || undefined,
        messages,
      }),
    });

    const data = await response.json();

    const assistantMsg = data.content?.[0]?.text || '';
    if (assistantMsg) {
      stmt("INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)").run(sid, assistantMsg);
    }

    stmt("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sid);

    res.json({ sessionId: sid, ...data });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

export default router;
