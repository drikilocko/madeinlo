// Suivi de commande pour les clients (sans compte).
// Accès : numéro de commande + clé secrète (lien reçu après paiement)
//      ou numéro de commande + téléphone utilisé lors de la commande.
// Ne renvoie que l'état de la commande (jamais adresse, email ni téléphone).
import { supabaseGet } from './_supabase.js';
import { parseJsonBody, setup, sendError, HttpError, requireInt } from './_helpers.js';
import { checkRateLimit, recordFailure, clientIp } from './_auth.js';
import crypto from 'crypto';

function lastDigits(phone, n = 8) {
  return String(phone || '').replace(/\D/g, '').slice(-n);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Étapes affichées au client
function timeline(order) {
  const paid = order.payment_status === 'paid' || (!order.payment_status && order.status !== 'cancelled');
  const steps = [
    { key: 'ordered', label: 'Commande reçue', done: true, date: order.date },
    { key: 'paid', label: 'Paiement confirmé', done: paid, date: order.paid_at || null },
    { key: 'prepared', label: 'Commande préparée', done: ['completed', 'delivered'].includes(order.status), date: null },
    { key: 'delivered', label: 'Livrée', done: order.status === 'delivered', date: null }
  ];
  return steps;
}

function publicStatus(order) {
  if (order.status === 'cancelled' || ['cancelled', 'failed'].includes(order.payment_status)) {
    return { code: 'cancelled', label: 'Commande annulée' };
  }
  if (order.payment_status === 'unpaid' || order.status === 'awaiting_payment') {
    return { code: 'awaiting_payment', label: 'En attente de paiement' };
  }
  if (order.status === 'delivered') return { code: 'delivered', label: 'Livrée' };
  if (order.status === 'completed') return { code: 'prepared', label: 'Préparée — livraison en cours' };
  return { code: 'paid', label: 'Paiement confirmé — en préparation' };
}

export default async function handler(req, res) {
  if (setup(req, res, ['POST'])) return;

  try {
    const key = `track:${clientIp(req)}`;
    checkRateLimit(key, { max: 30 });

    const input = await parseJsonBody(req);
    const orderId = requireInt(input.order_id, 'numéro de commande');
    const order = (await supabaseGet('orders', { filter: { id: `eq.${orderId}` } }))[0];

    const byKey = order && input.key && safeEqual(order.payment_token, input.key);
    const phone = lastDigits(input.phone);
    const byPhone = order && phone.length >= 8 && phone === lastDigits(order.client_phone);

    if (!order || !(byKey || byPhone)) {
      recordFailure(key);
      throw new HttpError(404, 'Commande introuvable. Vérifiez le numéro de commande et le téléphone.');
    }

    const items = Array.isArray(order.items)
      ? order.items.map(i => ({ name: i.name, qty: i.qty }))
      : [{ name: order.product_name, qty: 1 }];

    return res.status(200).json({
      order_id: order.id,
      date: order.date,
      status: publicStatus(order),
      steps: timeline(order),
      items,
      amount: order.amount || null,
      amount_label: order.amount ? `${Number(order.amount).toLocaleString('fr-FR')} FCFA` : (order.product_price || ''),
      payment_method: order.payment_method || null
    });
  } catch (e) {
    return sendError(res, e);
  }
}
