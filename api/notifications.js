import { supabase } from './_supabase.js';

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
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (method === 'POST') {
      const input = req.body || {};

      if (input.action === 'mark_read') {
        const { error } = await supabase
          .from('admin_notifications')
          .update({ is_read: true })
          .eq('id', input.id);

        if (error) throw error;
        return res.status(200).json({ status: 'success' });
      }

      return res.status(200).json({});
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
