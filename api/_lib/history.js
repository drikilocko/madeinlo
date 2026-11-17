import { supabaseGet } from './_supabase.js';
import { setup, sendError } from './_helpers.js';
import { requireAdminOrShop } from './_auth.js';

export default async function handler(req, res) {
  if (setup(req, res, ['GET'])) return;

  try {
    const auth = await requireAdminOrShop(req);

    // Un partenaire ne voit que l'historique de sa boutique
    if (auth.role === 'shop') {
      const data = await supabaseGet('activity_log', {
        order: 'created_at.desc',
        limit: 300,
        filter: { shop_id: `eq.${auth.shop.id}` }
      });
      return res.status(200).json(data);
    }

    const data = await supabaseGet('activity_log', { order: 'created_at.desc', limit: 100 });
    return res.status(200).json(data);
  } catch (e) {
    return sendError(res, e);
  }
}
