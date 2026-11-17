import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import { parseJsonBody, setup, sendError, HttpError, cleanText, requireInt } from './_helpers.js';
import { requireAdmin } from './_auth.js';

export default async function handler(req, res) {
  if (setup(req, res)) return;

  try {
    if (req.method === 'GET') {
      const data = await supabaseGet('categories', { order: 'name.asc' });
      return res.status(200).json(data);
    }

    await requireAdmin(req);
    const input = await parseJsonBody(req);

    if (input.action === 'toggle_visibility') {
      await supabasePatch('categories', { is_visible: Boolean(input.is_visible) }, { id: requireInt(input.id, 'id') });
      return res.status(200).json({ status: 'success' });
    }

    if (input.action === 'add') {
      const name = cleanText(input.name, 80);
      if (!name) throw new HttpError(400, 'Nom de catégorie requis');
      const data = await supabasePost('categories', { name });
      return res.status(200).json({ status: 'success', id: data[0].id });
    }

    if (input.action === 'edit') {
      const id = requireInt(input.id, 'id');
      const newName = cleanText(input.new_name, 80);
      if (!newName) throw new HttpError(400, 'Nom de catégorie requis');
      const current = (await supabaseGet('categories', { filter: { id: `eq.${id}` } }))[0];
      if (!current) throw new HttpError(404, 'Catégorie introuvable');

      await supabasePatch('categories', { name: newName }, { id });
      await supabasePatch('products', { category: newName }, { category: current.name });
      return res.status(200).json({ status: 'success' });
    }

    if (input.action === 'delete') {
      const id = requireInt(input.id, 'id');
      const current = (await supabaseGet('categories', { filter: { id: `eq.${id}` } }))[0];
      if (!current) throw new HttpError(404, 'Catégorie introuvable');

      await supabaseDelete('categories', { id });
      await supabasePatch('products', { category: 'General' }, { category: current.name });
      return res.status(200).json({ status: 'success' });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
