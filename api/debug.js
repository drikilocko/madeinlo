import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const url = process.env.SUPABASE_URL || 'MISSING';
    const key = process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING';

    let dbStatus = 'unknown';
    let dbError = null;
    let tables = [];

    try {
      const data = await supabaseGet('products', { limit: 1 });
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error';
      dbError = e.message;
    }

    return res.status(200).json({
      env: { url, key },
      db: { status: dbStatus, error: dbError }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
