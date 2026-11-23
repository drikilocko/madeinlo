// Paiement PayDunya : Mobile Money (SoftPay, validation sur le téléphone) ou carte (page sécurisée PayDunya).
// La commande n'est validée (statut "paid", stock décrémenté) qu'après confirmation par PayDunya.
import { supabaseGet, supabasePost, supabasePatch } from './_supabase.js';
import { parseJsonBody, setup, sendError, HttpError, cleanText, requireInt } from './_helpers.js';
import { checkRateLimit, recordFailure, clientIp } from './_auth.js';
import { OPERATORS, createInvoice, softpay, isConfigured } from './_paydunya.js';
import { buildOrderLines, settleOrder } from './_orders.js';

function siteOrigin(req) {
  const fromEnv = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}`;
}

async function findOrder(orderId, token) {
  const order = (await supabaseGet('orders', { filter: { id: `eq.${orderId}` } }))[0];
  // Le jeton de facture sert de preuve : seul le client qui a lancé le paiement le connaît
  if (!order || !token || order.payment_token !== token) throw new HttpError(404, 'Commande introuvable');
  return order;
}

export default async function handler(req, res) {
  if (setup(req, res, ['GET', 'POST'])) return;

  try {
    // Liste des moyens de paiement pour la page de checkout
    if (req.method === 'GET') {
      return res.status(200).json({
        available: isConfigured(),
        operators: Object.entries(OPERATORS).map(([key, op]) => ({ key, label: op.label })),
        card: true
      });
    }

    const input = await parseJsonBody(req);

    // ---------------- Lancer un paiement ----------------
    if (input.action === 'init') {
      if (!isConfigured()) throw new HttpError(503, 'Le paiement en ligne est momentanément indisponible.');

      const key = `pay:${clientIp(req)}`;
      checkRateLimit(key, { max: 10 });

      const method = String(input.method || '');
      const isCard = method === 'card';
      if (!isCard && !OPERATORS[method]) throw new HttpError(400, 'Moyen de paiement non supporté');

      const c = input.customer || {};
      const customer = {
        name: cleanText(c.name, 120),
        phone: cleanText(c.phone, 40),
        email: cleanText(c.email, 200),
        address: cleanText(c.address, 400, { multiline: true })
      };
      if (!customer.name || !customer.phone || !customer.address) {
        throw new HttpError(400, 'Nom, téléphone et adresse de livraison sont requis');
      }
      if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        throw new HttpError(400, 'Adresse email invalide');
      }

      // Position de livraison choisie sur la carte (obligatoire)
      const loc = input.location || {};
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
        throw new HttpError(400, 'Indiquez votre position de livraison sur la carte');
      }
      const gps = `GPS: ${lat.toFixed(6)},${lng.toFixed(6)}`;
      customer.address = `${customer.address.slice(0, 340)} | ${gps}`;

      let paymentPhone = '';
      if (!isCard) {
        paymentPhone = String(input.payment_phone || '').replace(/\D/g, '');
        if (!/^\d{8,15}$/.test(paymentPhone)) throw new HttpError(400, 'Numéro Mobile Money invalide');
      }

      const { lines, total, label } = await buildOrderLines(input.items);
      const size = cleanText(input.size, 40) || 'M';

      // 1) Commande en attente de paiement (pas encore validée, stock non touché)
      const created = await supabasePost('orders', [{
        type: 'delivery',
        product_id: lines[0].product_id,
        product_name: label,
        product_price: `${total} FCFA`,
        size,
        client_name: customer.name,
        client_email: customer.email,
        client_phone: customer.phone,
        client_address: customer.address,
        status: 'awaiting_payment',
        payment_status: 'unpaid',
        payment_method: isCard ? 'card' : method,
        amount: total,
        items: lines
      }]);
      const order = created[0];

      // 2) Facture PayDunya liée à cette commande (montant + numéro contrôlés au retour)
      const origin = siteOrigin(req);
      let invoice;
      try {
        invoice = await createInvoice({
          amount: total,
          description: `Commande MADE IN LO #${order.id}`,
          orderId: order.id,
          customer,
          urls: {
            return: `${origin}/checkout?payment=return&order=${order.id}`,
            cancel: `${origin}/checkout?payment=cancel&order=${order.id}`,
            callback: `${origin}/api/paydunya-ipn`
          }
        });
      } catch (e) {
        await supabasePatch('orders', { payment_status: 'failed', status: 'cancelled' }, { id: order.id });
        throw e;
      }
      await supabasePatch('orders', { payment_token: invoice.token }, { id: order.id });
      recordFailure(key); // compte la tentative dans la limite anti-spam

      // 3a) Carte : page de paiement sécurisée PayDunya (ouverte dans une fenêtre au-dessus du site)
      if (isCard) {
        return res.status(200).json({
          status: 'pending',
          order_id: order.id,
          token: invoice.token,
          amount: total,
          checkout_url: invoice.checkoutUrl
        });
      }

      // 3b) Mobile Money : demande de validation envoyée sur le téléphone du client
      try {
        const sp = await softpay(method, {
          token: invoice.token,
          name: customer.name,
          email: customer.email || 'client@madeinlo.com',
          phone: paymentPhone,
          address: customer.address.slice(0, 120)
        });
        return res.status(200).json({ status: 'pending', order_id: order.id, token: invoice.token, amount: total, message: sp.message });
      } catch (e) {
        await supabasePatch('orders', { payment_status: 'failed', status: 'cancelled' }, { id: order.id, payment_status: 'unpaid' });
        throw e;
      }
    }

    // ---------------- Vérifier un paiement ----------------
    if (input.action === 'status') {
      const orderId = requireInt(input.order_id, 'order_id');
      const order = await findOrder(orderId, String(input.token || ''));
      const paymentStatus = await settleOrder(order);
      return res.status(200).json({ order_id: order.id, payment_status: paymentStatus });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
