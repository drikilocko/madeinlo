import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import { getQueryParam } from './_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const shopId = getQueryParam(req, 'shop_id');

    if (shopId) {
      const data = await supabaseGet('activity_log', { order: 'created_at.desc' });
      const filtered = data.filter(l => l.shop_id === shopId);
      return res.status(200).json(filtered || []);
    } else {
      const data = await supabaseGet('activity_log', { order: 'created_at.desc', limit: 100 });
      return res.status(200).json(data || []);
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
