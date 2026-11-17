// IPN PayDunya : notification serveur à serveur envoyée après un paiement (même si le client a fermé la page).
// On ne fait PAS confiance au contenu reçu : on vérifie le hash, puis on redemande le statut à PayDunya.
import crypto from 'crypto';
import { supabaseGet } from './_supabase.js';
import { masterKey } from './_paydunya.js';
import { settleOrder } from './_orders.js';

function readField(body, path) {
  if (!body || typeof body !== 'object') return undefined;
  // Format imbriqué : { data: { invoice: { token } } }
  let cur = body;
  for (const k of path) cur = cur && typeof cur === 'object' ? cur[k] : undefined;
  if (cur !== undefined) return cur;
  // Format "plat" urlencoded : { 'data[invoice][token]': '...' }
  const flat = path[0] + path.slice(1).map(k => `[${k}]`).join('');
  return body[flat];
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  try { return JSON.parse(raw); } catch { /* urlencoded */ }
  return Object.fromEntries(new URLSearchParams(raw));
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || '').toLowerCase());
  const y = Buffer.from(String(b || '').toLowerCase());
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = parseBody(req);
    const hash = readField(body, ['data', 'hash']);
    const token = readField(body, ['data', 'invoice', 'token']);

    const expected = crypto.createHash('sha512').update(masterKey()).digest('hex');
    if (!masterKey() || !safeEqual(hash, expected)) {
      console.warn('PayDunya IPN: hash invalide');
      return res.status(403).json({ error: 'invalid hash' });
    }
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
      return res.status(400).json({ error: 'invalid token' });
    }

    const order = (await supabaseGet('orders', { filter: { payment_token: `eq.${token}` } }))[0];
    if (!order) return res.status(200).json({ status: 'ignored' });

    // settleOrder interroge PayDunya (source de vérité) et contrôle montant + numéro de commande
    const status = await settleOrder(order);
    return res.status(200).json({ status });
  } catch (e) {
    console.error('PayDunya IPN error', e);
    return res.status(500).json({ error: 'internal error' });
  }
}
