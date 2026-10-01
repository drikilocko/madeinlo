import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import { parseJsonBody } from './_helpers.js';

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
    if (method === 'GET') {
      const data = await supabaseGet('orders', { order: 'date.desc' });
      return res.status(200).json(data || []);
    }

    if (method === 'POST') {
      const input = await parseJsonBody(req);

      if (!input.action) {
        return res.status(200).json({});
      }

      if (input.action === 'create') {
        const o = input.order || {};
        const items = input.items || [];

        for (const item of items) {
          const pId = parseInt(item.product_id);
          const qty = parseInt(item.qty);
          if (pId > 0 && qty > 0) {
            const products = await supabaseGet('products', {});
            const product = products.find(p => p.id === pId);

            if (product) {
              const newQty = Math.max(0, (product.stock_qty || 0) - qty);
              await supabasePatch('products', { stock_qty: newQty }, { id: pId });
            }
          }
        }

        const data = await supabasePost('orders', [{
          type: o.type || 'delivery',
          product_id: o.product_id || 0,
          product_name: o.product_name || '',
          product_price: o.product_price || '',
          size: o.size || 'M',
          client_name: o.client_name || '',
          client_email: o.client_email || '',
          client_phone: o.client_phone || '',
          client_address: o.client_address || '',
          status: o.status || 'pending'
        }]);

        const orderId = data[0].id;

        const clientEmail = o.client_email || '';
        if (clientEmail) {
          console.log('Order confirmation email would be sent to:', clientEmail);
        }

        const logMsg = `Nouvelle commande en ligne : '${o.product_name || ''}' commandé par ${o.client_name || ''}.`;
        await supabasePost('activity_log', [{
          type: 'sale_online',
          product_id: o.product_id || null,
          product_name: o.product_name || '',
          message: logMsg
        }]);

        return res.status(200).json({ status: 'success', id: orderId });
      } else if (input.action === 'update_status') {
        await supabasePatch('orders', { status: input.status }, { id: input.order_id });
        return res.status(200).json({ status: 'success' });
      }

      return res.status(200).json({});
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
