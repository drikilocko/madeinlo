// Client PayDunya (serveur uniquement). Les clés restent dans les variables d'environnement Vercel.
// Doc : https://developers.paydunya.com/doc/FR/http_json  et  /doc/FR/softpay
import { HttpError } from './_helpers.js';

const MASTER_KEY = (process.env.PAYDUNYA_MASTER_KEY || '').trim();
const PRIVATE_KEY = (process.env.PAYDUNYA_PRIVATE_KEY || '').trim();
const TOKEN = (process.env.PAYDUNYA_TOKEN || '').trim();
// PAYDUNYA_MODE=test -> bac à sable ; sinon production
const IS_TEST = (process.env.PAYDUNYA_MODE || '').trim().toLowerCase() === 'test';
const API_BASE = IS_TEST ? 'https://app.paydunya.com/sandbox-api/v1' : 'https://app.paydunya.com/api/v1';

export const STORE = {
  name: 'Made in Lo',
  tagline: 'Mode africaine contemporaine',
  postal_address: 'Lomé, Togo'
};

// Opérateurs Mobile Money SoftPay (paiement validé sur le téléphone du client, sans redirection).
// Champs repris de la documentation officielle PayDunya SoftPay.
export const OPERATORS = {
  'tmoney-tg': {
    label: 'T-Money (Togo)', endpoint: 't-money-togo',
    body: ({ token, name, email, phone }) => ({ name_t_money: name, email_t_money: email, phone_t_money: phone, payment_token: token })
  },
  'moov-tg': {
    label: 'Moov Money / Flooz (Togo)', endpoint: 'moov-togo',
    body: ({ token, name, email, phone, address }) => ({ moov_togo_customer_fullname: name, moov_togo_email: email, moov_togo_customer_address: address, moov_togo_phone_number: phone, payment_token: token })
  },
  'moov-bj': {
    label: 'Moov Money (Bénin)', endpoint: 'moov-benin',
    body: ({ token, name, email, phone }) => ({ moov_benin_customer_fullname: name, moov_benin_email: email, moov_benin_phone_number: phone, payment_token: token })
  },
  'moov-ci': {
    label: 'Moov Money (Côte d\'Ivoire)', endpoint: 'moov-ci',
    body: ({ token, name, email, phone }) => ({ moov_ci_customer_fullname: name, moov_ci_email: email, moov_ci_phone_number: phone, payment_token: token })
  },
  'free-sn': {
    label: 'Free Money (Sénégal)', endpoint: 'free-money-senegal',
    body: ({ token, name, email, phone }) => ({ customer_name: name, customer_email: email, phone_number: phone, payment_token: token })
  },
  'orange-ml': {
    label: 'Orange Money (Mali)', endpoint: 'orange-money-mali',
    body: ({ token, name, email, phone, address }) => ({ orange_money_mali_customer_fullname: name, orange_money_mali_email: email, orange_money_mali_phone_number: phone, orange_money_mali_customer_address: address, payment_token: token })
  },
  'moov-ml': {
    label: 'Moov Money (Mali)', endpoint: 'moov-mali',
    body: ({ token, name, email, phone, address }) => ({ moov_ml_customer_fullname: name, moov_ml_email: email, moov_ml_phone_number: phone, moov_ml_customer_address: address, payment_token: token })
  },
  'moov-bf': {
    label: 'Moov Money (Burkina Faso)', endpoint: 'moov-burkina',
    body: ({ token, name, email, phone }) => ({ moov_burkina_faso_fullName: name, moov_burkina_faso_email: email, moov_burkina_faso_phone_number: phone, moov_burkina_faso_payment_token: token })
  }
};

export function isConfigured() {
  return Boolean(MASTER_KEY && PRIVATE_KEY && TOKEN);
}

export function masterKey() {
  return MASTER_KEY;
}

function headers() {
  if (!isConfigured()) throw new HttpError(503, 'Paiement non configuré. Réessayez plus tard.');
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': MASTER_KEY,
    'PAYDUNYA-PRIVATE-KEY': PRIVATE_KEY,
    'PAYDUNYA-TOKEN': TOKEN
  };
}

async function readJson(res) {
  try { return await res.json(); } catch { return null; }
}

// Crée une facture. Retourne { token, checkoutUrl }.
export async function createInvoice({ amount, description, orderId, customer, urls }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/checkout-invoice/create`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        invoice: { total_amount: amount, description },
        store: STORE,
        actions: { cancel_url: urls.cancel, return_url: urls.return, callback_url: urls.callback },
        custom_data: { order_id: String(orderId), amount: String(amount), customer_phone: customer.phone }
      })
    });
  } catch {
    throw new HttpError(502, 'Impossible de joindre le service de paiement.');
  }
  const data = await readJson(res);
  if (!res.ok || !data || data.response_code !== '00' || !data.token) {
    console.error('PayDunya invoice error', res.status, data);
    throw new HttpError(502, 'Le service de paiement a refusé la demande. Réessayez.');
  }
  return { token: data.token, checkoutUrl: data.response_text };
}

// Déclenche la demande de paiement sur le téléphone du client (SoftPay).
export async function softpay(operatorKey, { token, name, email, phone, address }) {
  const op = OPERATORS[operatorKey];
  if (!op) throw new HttpError(400, 'Opérateur non supporté');
  let res;
  try {
    res = await fetch(`${API_BASE}/softpay/${op.endpoint}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(op.body({ token, name, email, phone, address }))
    });
  } catch {
    throw new HttpError(502, 'Opérateur Mobile Money injoignable.');
  }
  const data = await readJson(res);
  if (!res.ok || !data || data.success !== true) {
    console.error('PayDunya softpay error', operatorKey, res.status, data);
    const msg = data && [data.message, data.error].find(v => typeof v === 'string');
    throw new HttpError(502, msg || 'La demande Mobile Money a échoué. Vérifiez le numéro et réessayez.');
  }
  return { message: typeof data.message === 'string' ? data.message : 'Demande envoyée. Validez le paiement sur votre téléphone.' };
}

// Vérifie l'état réel d'une facture auprès de PayDunya (source de vérité).
export async function confirmInvoice(token) {
  let res;
  try {
    res = await fetch(`${API_BASE}/checkout-invoice/confirm/${encodeURIComponent(token)}`, { headers: headers() });
  } catch {
    throw new HttpError(502, 'Impossible de vérifier le paiement pour le moment.');
  }
  const data = await readJson(res);
  if (!res.ok || !data) throw new HttpError(502, 'Réponse de vérification invalide.');

  const invoice = data.invoice && typeof data.invoice === 'object' ? data.invoice : {};
  const custom = data.custom_data && typeof data.custom_data === 'object' ? data.custom_data : {};
  const raw = typeof data.status === 'string' ? data.status.toLowerCase() : 'pending';
  return {
    status: ['completed', 'pending', 'cancelled', 'failed'].includes(raw) ? raw : 'pending',
    amount: Number(invoice.total_amount ?? data.total_amount),
    orderId: custom.order_id !== undefined ? String(custom.order_id) : null,
    receiptUrl: typeof data.receipt_url === 'string' ? data.receipt_url : null
  };
}
