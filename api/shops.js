import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import bcrypt from 'bcryptjs';
import { parsePrice, parseJsonBody } from './_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const shops = await supabaseGet('shops', { select: 'id, name, address, lat, lng, login, is_primary' });
        const logs = await supabaseGet('activity_log', { select: 'shop_id, product_id, qty, type' });

        const saleLogs = logs.filter(l => l.type === 'sale_partner');
        const shopIds = [...new Set(saleLogs.map(l => l.shop_id).filter(Boolean))];
        const productIds = [...new Set(saleLogs.map(l => l.product_id).filter(Boolean))];

        let productMap = new Map();
        if (productIds.length > 0) {
          const products = await supabaseGet('products', { select: 'id, price' });
          productMap = new Map((products || []).map(p => [p.id, parsePrice(p.price)]));
        }

        const result = (shops || []).map(shop => {
          const shopLogs = saleLogs.filter(l => l.shop_id === shop.id);
          const totalQtySold = shopLogs.reduce((sum, l) => sum + (l.qty || 0), 0);
          const totalRevenue = shopLogs.reduce((sum, l) => {
            const price = productMap.get(l.product_id) || 0;
            return sum + (l.qty * price);
          }, 0);

          return {
            ...shop,
            total_qty_sold: totalQtySold,
            total_revenue: totalRevenue
          };
        });

        return res.status(200).json(result);
      }

      case 'POST': {
        const input = await parseJsonBody(req);

        if (!input.action) {
          return res.status(200).json({});
        }

        if (input.action === 'add') {
          const s = input.shop || {};
          const isPrimary = parseInt(s.is_primary) === 1;

          if (isPrimary) {
            const allShops = await supabaseGet('shops', {});
            for (const shop of allShops) {
              if (shop.id !== 0) {
                await supabasePatch('shops', { is_primary: false }, { id: shop.id });
              }
            }
          }

          const pass = bcrypt.hashSync(s.password, 10);
          const data = await supabasePost('shops', {
            name: s.name,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            login: s.login,
            password: pass,
            is_primary: isPrimary
          });

          return res.status(200).json({ status: 'success', id: data[0].id });
        } else if (input.action === 'edit') {
          const s = input.shop || {};
          const id = parseInt(input.id);
          const isPrimary = parseInt(s.is_primary) === 1;

          if (isPrimary) {
            const allShops = await supabaseGet('shops', {});
            for (const shop of allShops) {
              if (shop.id !== id) {
                await supabasePatch('shops', { is_primary: false }, { id: shop.id });
              }
            }
          }

          if (s.password) {
            const pass = bcrypt.hashSync(s.password, 10);
            await supabasePatch('shops', {
              name: s.name,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              login: s.login,
              password: pass,
              is_primary: isPrimary
            }, { id });
          } else {
            await supabasePatch('shops', {
              name: s.name,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              login: s.login,
              is_primary: isPrimary
            }, { id });
          }

          return res.status(200).json({ status: 'success' });
        } else if (input.action === 'delete') {
          await supabaseDelete('shops', { id: input.id });
          return res.status(200).json({ status: 'success' });
        }

        return res.status(200).json({});
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

function parsePrice(str) {
  if (!str) return 0;
  const num = parseFloat(str.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
}
