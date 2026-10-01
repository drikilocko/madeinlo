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
    switch (method) {
      case 'GET': {
        const data = await supabaseGet('categories', { order: 'name.asc' });
        return res.status(200).json(data || []);
      }

      case 'POST': {
        const input = req.body || {};

        if (!input.action) {
          return res.status(200).json({});
        }

        if (input.action === 'toggle_visibility') {
          await supabasePatch('categories', { is_visible: Boolean(input.is_visible) }, { id: input.id });
          return res.status(200).json({ status: 'success' });
        } else if (input.action === 'add') {
          const name = input.name;
          const data = await supabasePost('categories', { name });
          return res.status(200).json({ status: 'success', id: data[0].id });
        } else if (input.action === 'edit') {
          const newName = input.new_name;
          const oldName = input.old_name;
          const id = input.id;

          await supabasePatch('categories', { name: newName }, { id });
          await supabasePatch('products', { category: newName }, { category: oldName });

          return res.status(200).json({ status: 'success' });
        } else if (input.action === 'delete') {
          const id = input.id;
          const name = input.name;

          await supabaseDelete('categories', { id });
          await supabasePatch('products', { category: 'General' }, { category: name });

          return res.status(200).json({ status: 'success' });
        }

        return res.status(200).json({});
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
