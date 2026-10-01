import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  try {
    if (method === 'GET') {
      const data = await supabaseGet('admin_notifications', { order: 'created_at.desc', limit: 20 });
      return res.status(200).json(data || []);
    }

    if (method === 'POST') {
      const input = req.body || {};

      if (input.action === 'mark_read') {
        await supabasePatch('admin_notifications', { is_read: true }, { id: input.id });
        return res.status(200).json({ status: 'success' });
      }

      return res.status(200).json({});
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
