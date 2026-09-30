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
    switch (method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return res.status(200).json(data || []);
      }

      case 'POST': {
        const input = req.body || {};

        if (!input.action) {
          return res.status(200).json({});
        }

        if (input.action === 'toggle_visibility') {
          const { error } = await supabase
            .from('categories')
            .update({ is_visible: Boolean(input.is_visible) })
            .eq('id', input.id);

          if (error) throw error;
          return res.status(200).json({ status: 'success' });
        } else if (input.action === 'add') {
          const name = input.name;
          const { data, error } = await supabase
            .from('categories')
            .insert([{ name }])
            .select('id');

          if (error) throw error;
          return res.status(200).json({ status: 'success', id: data[0].id });
        } else if (input.action === 'edit') {
          const newName = input.new_name;
          const oldName = input.old_name;
          const id = input.id;

          const { error: catError } = await supabase
            .from('categories')
            .update({ name: newName })
            .eq('id', id);

          if (catError) throw catError;

          const { error: prodError } = await supabase
            .from('products')
            .update({ category: newName })
            .eq('category', oldName);

          if (prodError) throw prodError;

          return res.status(200).json({ status: 'success' });
        } else if (input.action === 'delete') {
          const id = input.id;
          const name = input.name;

          const { error: catError } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

          if (catError) throw catError;

          const { error: prodError } = await supabase
            .from('products')
            .update({ category: 'General' })
            .eq('category', name);

          if (prodError) throw prodError;

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
