import { supabase } from './_supabase.js';
import bcrypt from 'bcryptjs';

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
        const { data: shops, error: shopsError } = await supabase
          .from('shops')
          .select('id, name, address, lat, lng, login, is_primary');

        if (shopsError) throw shopsError;

        const { data: logs, error: logsError } = await supabase
          .from('activity_log')
          .select('shop_id, product_id, qty')
          .eq('type', 'sale_partner');

        if (logsError) throw logsError;

        const shopIds = [...new Set(logs.map(l => l.shop_id).filter(Boolean))];
        const productIds = [...new Set(logs.map(l => l.product_id).filter(Boolean))];

        let productMap = new Map();
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, price')
            .in('id', productIds);
          productMap = new Map((products || []).map(p => [p.id, parsePrice(p.price)]));
        }

        const result = (shops || []).map(shop => {
          const shopLogs = logs.filter(l => l.shop_id === shop.id);
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
        const input = req.body || {};

        if (!input.action) {
          return res.status(200).json({});
        }

        if (input.action === 'add') {
          const s = input.shop || {};
          const isPrimary = parseInt(s.is_primary) === 1;

          if (isPrimary) {
            await supabase
              .from('shops')
              .update({ is_primary: false })
              .neq('id', 0);
          }

          const pass = bcrypt.hashSync(s.password, 10);
          const { data, error } = await supabase
            .from('shops')
            .insert([{
              name: s.name,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              login: s.login,
              password: pass,
              is_primary: isPrimary
            }])
            .select('id');

          if (error) throw error;
          return res.status(200).json({ status: 'success', id: data[0].id });
        } else if (input.action === 'edit') {
          const s = input.shop || {};
          const id = parseInt(input.id);
          const isPrimary = parseInt(s.is_primary) === 1;

          if (isPrimary) {
            await supabase
              .from('shops')
              .update({ is_primary: false })
              .neq('id', id);
          }

          if (s.password) {
            const pass = bcrypt.hashSync(s.password, 10);
            const { error } = await supabase
              .from('shops')
              .update({
                name: s.name,
                address: s.address,
                lat: s.lat,
                lng: s.lng,
                login: s.login,
                password: pass,
                is_primary: isPrimary
              })
              .eq('id', id);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('shops')
              .update({
                name: s.name,
                address: s.address,
                lat: s.lat,
                lng: s.lng,
                login: s.login,
                is_primary: isPrimary
              })
              .eq('id', id);

            if (error) throw error;
          }

          return res.status(200).json({ status: 'success' });
        } else if (input.action === 'delete') {
          const { error } = await supabase
            .from('shops')
            .delete()
            .eq('id', input.id);

          if (error) throw error;
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
