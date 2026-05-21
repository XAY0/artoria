import { Router } from 'express';
import { getDb, stmt } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  await getDb();
  const rows = stmt(
    "SELECT id, type, name, description, content, metadata, created_at, updated_at FROM memories ORDER BY updated_at DESC"
  ).all();

  const memories = rows.map(r => ({
    ...r,
    metadata: JSON.parse(r.metadata || '{}'),
  }));

  res.json({ memories });
});

router.post('/', async (req, res) => {
  const { type, name, description, content, metadata } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: { message: 'name 和 content 不能为空' } });
  }

  await getDb();
  const existing = stmt("SELECT id FROM memories WHERE name = ?").get(name);

  if (existing) {
    stmt(
      "UPDATE memories SET type = ?, description = ?, content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(type || 'reference', description || '', content, JSON.stringify(metadata || {}), existing.id);
    res.json({ id: existing.id, updated: true });
  } else {
    const result = stmt(
      "INSERT INTO memories (type, name, description, content, metadata) VALUES (?, ?, ?, ?, ?)"
    ).run(type || 'reference', name, description || '', content, JSON.stringify(metadata || {}));
    res.status(201).json({ id: result.lastInsertRowid, created: true });
  }
});

router.delete('/:id', async (req, res) => {
  await getDb();
  stmt("DELETE FROM memories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
