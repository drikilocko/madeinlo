import { supabaseGet, supabasePatch } from './_supabase.js';
import { parseJsonBody, setup, sendError, HttpError, requireInt } from './_helpers.js';
import { requireAdmin } from './_auth.js';

export default async function handler(req, res) {
  if (setup(req, res)) return;

  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const data = await supabaseGet('admin_notifications', { order: 'created_at.desc', limit: 20 });
      return res.status(200).json(data);
    }

    const input = await parseJsonBody(req);
    if (input.action === 'mark_read') {
      await supabasePatch('admin_notifications', { is_read: true }, { id: requireInt(input.id, 'id') });
      return res.status(200).json({ status: 'success' });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
