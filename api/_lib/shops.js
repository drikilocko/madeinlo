import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import bcrypt from 'bcryptjs';
import { parsePrice, parseJsonBody, setup, sendError, HttpError, cleanText, requireInt } from './_helpers.js';
import { requireAdmin, getAdmin } from './_auth.js';

const PUBLIC_FIELDS = 'id,name,address,lat,lng,is_primary';

function coord(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && Math.abs(n) <= 180 ? String(n) : null;
}

function shopFields(s, { requirePassword }) {
  const fields = {
    name: cleanText(s.name, 120),
    address: cleanText(s.address, 300),
    lat: coord(s.lat),
    lng: coord(s.lng),
    login: cleanText(s.login, 60).replace(/\s+/g, ''),
    is_primary: parseInt(s.is_primary, 10) === 1 || s.is_primary === true
  };
  if (!fields.name || !fields.login) throw new HttpError(400, 'Nom et identifiant requis');
  const password = String(s.password || '');
  if (password) {
    if (password.length < 8) throw new HttpError(400, 'Le mot de passe doit faire au moins 8 caractères');
    fields.password = bcrypt.hashSync(password.slice(0, 72), 10);
  } else if (requirePassword) {
    throw new HttpError(400, 'Mot de passe requis');
  }
  return fields;
}

async function clearOtherPrimary(exceptId) {
  const shops = await supabaseGet('shops', { select: 'id', filter: { is_primary: 'eq.true' } });
  for (const shop of shops) {
    if (shop.id !== exceptId) await supabasePatch('shops', { is_primary: false }, { id: shop.id });
  }
}

export default async function handler(req, res) {
  if (setup(req, res)) return;

  try {
    if (req.method === 'GET') {
      const admin = await getAdmin(req);

      // Public (carte des boutiques) : jamais d'identifiant ni de mot de passe
      if (!admin) {
        const shops = await supabaseGet('shops', { select: PUBLIC_FIELDS });
        return res.status(200).json(shops);
      }

      const shops = await supabaseGet('shops', { select: PUBLIC_FIELDS + ',login' });
      const logs = await supabaseGet('activity_log', {
        select: 'shop_id,product_id,qty',
        filter: { type: 'eq.sale_partner' }
      });
      const products = logs.length > 0 ? await supabaseGet('products', { select: 'id,price' }) : [];
      const priceMap = new Map(products.map(p => [p.id, parsePrice(p.price)]));

      const result = shops.map(shop => {
        const shopLogs = logs.filter(l => l.shop_id === shop.id);
        return {
          ...shop,
          total_qty_sold: shopLogs.reduce((sum, l) => sum + (l.qty || 0), 0),
          total_revenue: shopLogs.reduce((sum, l) => sum + (l.qty || 0) * (priceMap.get(l.product_id) || 0), 0)
        };
      });
      return res.status(200).json(result);
    }

    await requireAdmin(req);
    const input = await parseJsonBody(req);

    if (input.action === 'add') {
      const fields = shopFields(input.shop || {}, { requirePassword: true });
      const data = await supabasePost('shops', fields);
      if (fields.is_primary) await clearOtherPrimary(data[0].id);
      return res.status(200).json({ status: 'success', id: data[0].id });
    }

    if (input.action === 'edit') {
      const id = requireInt(input.id, 'id');
      const fields = shopFields(input.shop || {}, { requirePassword: false });
      await supabasePatch('shops', fields, { id });
      if (fields.is_primary) await clearOtherPrimary(id);
      return res.status(200).json({ status: 'success' });
    }

    if (input.action === 'delete') {
      await supabaseDelete('shops', { id: requireInt(input.id, 'id') });
      return res.status(200).json({ status: 'success' });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    if (e && /duplicate key|23505/.test(e.message || '')) {
      return res.status(409).json({ error: 'Cet identifiant de connexion est déjà utilisé' });
    }
    return sendError(res, e);
  }
}
