import { supabaseGet, supabasePatch } from './_supabase.js';
import { parseJsonBody, setup, sendError, HttpError, requireInt } from './_helpers.js';
import { requireAdmin } from './_auth.js';

// Les commandes sont créées uniquement par /api/payment (paiement PayDunya obligatoire).
// L'admin peut ensuite faire avancer une commande PAYÉE (préparée / livrée) ou l'annuler.
const ADMIN_STATUSES = ['paid', 'completed', 'delivered', 'cancelled'];

export default async function handler(req, res) {
  if (setup(req, res)) return;

  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const data = await supabaseGet('orders', { order: 'date.desc' });
      return res.status(200).json(data);
    }

    const input = await parseJsonBody(req);

    if (input.action === 'update_status') {
      const status = String(input.status || '');
      if (!ADMIN_STATUSES.includes(status)) throw new HttpError(400, 'Statut invalide');
      const id = requireInt(input.order_id, 'order_id');

      const order = (await supabaseGet('orders', { filter: { id: `eq.${id}` } }))[0];
      if (!order) throw new HttpError(404, 'Commande introuvable');
      // Impossible de marquer "préparée/livrée" une commande dont le paiement n'est pas confirmé
      if (status !== 'cancelled' && order.payment_status && order.payment_status !== 'paid') {
        throw new HttpError(409, 'Paiement non confirmé pour cette commande');
      }

      await supabasePatch('orders', { status }, { id });
      return res.status(200).json({ status: 'success' });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
