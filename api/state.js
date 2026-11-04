import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

function userKey(req) {
  let name = '', pass = '';
  try {
    name = decodeURIComponent(String(req.headers['x-user'] || '')).trim().toLowerCase();
    pass = decodeURIComponent(String(req.headers['x-pass'] || ''));
  } catch (e) {}
  if (name.length < 2 || pass.length < 4) return null;
  return crypto.createHmac('sha256', process.env.APP_SECRET)
    .update(name + ':' + pass).digest('hex');
}

export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return res.status(500).json({ error: 'Database is not connected yet.' });
  if (!process.env.APP_SECRET) return res.status(500).json({ error: 'APP_SECRET is missing on the server.' });

  const key = userKey(req);
  if (!key) return res.status(401).json({ error: 'Enter a name (2+ letters) and a passcode (4+ characters).' });

  try {
    const sql = neon(dbUrl);
    await sql`CREATE TABLE IF NOT EXISTS app_state (
      user_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )`;

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM app_state WHERE user_key = ${key}`;
      return res.status(200).json({ data: rows.length ? rows[0].data : null });
    }

    if (req.method === 'PUT') {
      const data = req.body && req.body.data ? req.body.data : {};
      const text = JSON.stringify(data);
      if (text.length > 200000) return res.status(413).json({ error: 'Too much data.' });
      await sql`INSERT INTO app_state (user_key, data) VALUES (${key}, ${text}::jsonb)
                ON CONFLICT (user_key) DO UPDATE SET data = ${text}::jsonb, updated_at = now()`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Database error. Check the Neon connection.' });
  }
}
