// Logique commune des commandes : calcul du panier (prix depuis la base) et validation après paiement.
import { supabaseGet, supabasePost, supabasePatch } from './_supabase.js';
import { HttpError, toInt, parsePrice, formatCurrency } from './_helpers.js';
import { confirmInvoice } from './_paydunya.js';

// Regroupe le panier par produit et récupère prix / nom depuis Supabase (jamais depuis le navigateur).
export async function buildOrderLines(rawItems) {
  const qtyById = new Map();
  for (const item of (Array.isArray(rawItems) ? rawItems : []).slice(0, 100)) {
    const id = toInt(item && item.product_id, { min: 1 });
    const qty = toInt(item && (item.qty ?? 1), { min: 1, max: 20 });
    if (id === null || qty === null) continue;
    qtyById.set(id, Math.min(50, (qtyById.get(id) || 0) + qty));
  }
  if (qtyById.size === 0) throw new HttpError(400, 'Panier vide ou invalide');

  const products = await supabaseGet('products', {
    select: 'id,name,price,stock_qty,is_visible',
    filter: { id: `in.(${[...qtyById.keys()].join(',')})` }
  });
  const byId = new Map(products.map(p => [p.id, p]));

  const lines = [];
  for (const [id, qty] of qtyById) {
    const product = byId.get(id);
    if (!product || product.is_visible === false) {
      throw new HttpError(400, 'Un produit du panier n\'est plus disponible. Mettez votre panier à jour.');
    }
    const unit = parsePrice(product.price);
    if (unit <= 0) throw new HttpError(400, `Le produit « ${product.name} » n'a pas de prix valide.`);
    lines.push({ product_id: id, name: product.name, qty, unit_price: unit });
  }

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
  const label = lines.map(l => (l.qty > 1 ? `${l.qty} x ` : '') + l.name).join(', ').slice(0, 500);
  return { lines, total, label };
}

// Valide une commande payée. Idempotent : la mise à jour conditionnelle (payment_status=unpaid)
// garantit que le stock n'est décrémenté qu'une seule fois, même si l'IPN et le navigateur arrivent ensemble.
export async function markOrderPaid(order) {
  const updated = await supabasePatch('orders', {
    payment_status: 'paid',
    status: 'paid',
    paid_at: new Date().toISOString()
  }, { id: order.id, payment_status: 'unpaid' });

  if (!Array.isArray(updated) || updated.length === 0) return false; // déjà traité

  const lines = Array.isArray(order.items) ? order.items : [];
  for (const line of lines) {
    const product = (await supabaseGet('products', { select: 'id,stock_qty', filter: { id: `eq.${line.product_id}` } }))[0];
    if (product) {
      await supabasePatch('products', { stock_qty: Math.max(0, (product.stock_qty || 0) - (line.qty || 0)) }, { id: product.id });
    }
  }

  const msg = `Commande #${order.id} payée (${order.payment_method || 'paiement'}) : '${order.product_name}' — ${formatCurrency(order.amount || 0)} — client ${order.client_name}.`;
  await supabasePost('activity_log', [{
    type: 'sale_online',
    product_id: lines[0] ? lines[0].product_id : null,
    product_name: order.product_name,
    message: msg.slice(0, 1000)
  }]);
  await supabasePost('admin_notifications', [{ message: msg.slice(0, 1000) }]);
  return true;
}

// Interroge PayDunya et met la commande à jour. Retourne le statut de paiement final.
export async function settleOrder(order) {
  if (order.payment_status === 'paid') return 'paid';
  if (!order.payment_token) return order.payment_status || 'unpaid';

  const result = await confirmInvoice(order.payment_token);

  if (result.status === 'completed') {
    // Contrôles anti-fraude : la facture doit correspondre exactement à cette commande
    if (result.orderId !== String(order.id) || result.amount !== Number(order.amount)) {
      console.error('Payment mismatch', { order: order.id, amount: order.amount, result });
      await supabasePatch('orders', { payment_status: 'mismatch' }, { id: order.id, payment_status: 'unpaid' });
      return 'mismatch';
    }
    await markOrderPaid(order);
    return 'paid';
  }

  if (result.status === 'cancelled' || result.status === 'failed') {
    await supabasePatch('orders', { payment_status: result.status, status: 'cancelled' }, { id: order.id, payment_status: 'unpaid' });
    return result.status;
  }

  return 'unpaid';
}
