import { supabase } from './_supabase.js';

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
      const shopId = getQueryParam(req, 'shop_id');
      const type = getQueryParam(req, 'type') || 'stock';

      const { data: zeroStockProducts } = await supabase
        .from('products')
        .select('id')
        .lte('stock_qty', 0);

      if (zeroStockProducts && zeroStockProducts.length > 0) {
        const ids = zeroStockProducts.map(p => p.id);
        await supabase
          .from('shop_stock')
          .update({ qty: 0 })
          .in('product_id', ids);

        await supabase
          .from('stock_shipments')
          .update({ status: 'accepted' })
          .in('product_id', ids)
          .eq('status', 'pending');
      }

      if (shopId) {
        if (type === 'stock') {
          const { data, error } = await supabase
            .from('shop_stock')
            .select('*, products(name, price, image_url, category, stock_qty)')
            .eq('shop_id', shopId);

          if (error) throw error;
          return res.status(200).json(data || []);
        } else {
          const { data, error } = await supabase
            .from('stock_shipments')
            .select('*, products(name, price, image_url, category)')
            .eq('shop_id', shopId)
            .eq('status', 'pending');

          if (error) throw error;

          const grouped = new Map();
          for (const row of data || []) {
            const key = `${row.shop_id}-${row.product_id}`;
            if (!grouped.has(key)) {
              grouped.set(key, {
                id: row.id,
                shop_id: row.shop_id,
                product_id: row.product_id,
                qty: 0,
                status: row.status,
                name: row.products?.name,
                price: row.products?.price,
                image_url: row.products?.image_url,
                category: row.products?.category
              });
            }
            grouped.get(key).qty += (row.qty || 0);
          }

          return res.status(200).json(Array.from(grouped.values()));
        }
      }

      return res.status(200).json([]);
    }

    if (method === 'POST') {
      const input = req.body || {};

      if (!input.action) {
        return res.status(200).json({});
      }

      if (input.action === 'assign') {
        const shopId = parseInt(input.shop_id);
        const productId = parseInt(input.product_id);
        const qty = parseInt(input.qty);

        const { data: product, error: prodError } = await supabase
          .from('products')
          .select('name, stock_qty')
          .eq('id', productId)
          .single();

        if (prodError || !product) {
          return res.status(200).json({ status: 'error', message: 'Produit non trouvé' });
        }

        if ((product.stock_qty || 0) < qty) {
          return res.status(200).json({ status: 'error', message: `Stock central insuffisant (Max disponible : ${product.stock_qty})` });
        }

        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .select('name')
          .eq('id', shopId)
          .single();

        if (shopError || !shop) {
          return res.status(200).json({ status: 'error', message: 'Shop non trouvé' });
        }

        await supabase
          .from('products')
          .update({ stock_qty: (product.stock_qty || 0) - qty })
          .eq('id', productId);

        await supabase
          .from('stock_shipments')
          .insert([{ shop_id: shopId, product_id: productId, qty, status: 'pending' }]);

        const logMsg = `Envoi de stock en attente : ${qty} unité(s) de '${product.name}' expédiée(s) à '${shop.name}'.`;
        await supabase
          .from('activity_log')
          .insert([{
            type: 'assignment',
            shop_id: shopId,
            shop_name: shop.name,
            product_id: productId,
            product_name: product.name,
            qty,
            message: logMsg
          }]);

        return res.status(200).json({ status: 'success' });
      } else if (input.action === 'accept_shipment') {
        const shipmentId = parseInt(input.id);

        const { data: refShip, error: shipError } = await supabase
          .from('stock_shipments')
          .select('*')
          .eq('id', shipmentId)
          .eq('status', 'pending')
          .single();

        if (shipError || !refShip) {
          return res.status(200).json({ status: 'error', message: 'Expédition non trouvée' });
        }

        const shopId = refShip.shop_id;
        const productId = refShip.product_id;

        const { data: pendingShipments } = await supabase
          .from('stock_shipments')
          .select('qty')
          .eq('shop_id', shopId)
          .eq('product_id', productId)
          .eq('status', 'pending');

        const totalQty = (pendingShipments || []).reduce((sum, s) => sum + (s.qty || 0), 0);

        if (totalQty > 0) {
          const { data: existing } = await supabase
            .from('shop_stock')
            .select('id, qty')
            .eq('shop_id', shopId)
            .eq('product_id', productId)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('shop_stock')
              .update({ qty: (existing.qty || 0) + totalQty })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('shop_stock')
              .insert([{ shop_id: shopId, product_id: productId, qty: totalQty }]);
          }

          await supabase
            .from('stock_shipments')
            .update({ status: 'accepted' })
            .eq('shop_id', shopId)
            .eq('product_id', productId)
            .eq('status', 'pending');

          const logMsg = `Réception confirmée : Le shop a accepté toutes les expéditions en attente pour ce produit (Total: ${totalQty} unités).`;
          await supabase
            .from('activity_log')
            .insert([{
              type: 'assignment',
              shop_id: shopId,
              product_id: productId,
              message: logMsg
            }]);

          return res.status(200).json({ status: 'success' });
        } else {
          return res.status(200).json({ status: 'error', message: 'Aucune expédition en attente pour ce produit' });
        }
      } else if (input.action === 'rectify') {
        const shopId = parseInt(input.shop_id);
        const productId = parseInt(input.product_id);
        const qty = parseInt(input.qty);

        const { data: existing, error: existError } = await supabase
          .from('shop_stock')
          .select('id, qty')
          .eq('shop_id', shopId)
          .eq('product_id', productId)
          .maybeSingle();

        if (existError) throw existError;

        const oldQty = existing ? (existing.qty || 0) : 0;
        const diff = qty - oldQty;

        if (existing) {
          const { error: updateError } = await supabase
            .from('shop_stock')
            .update({ qty })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('shop_stock')
            .insert([{ shop_id: shopId, product_id: productId, qty }]);

          if (insertError) throw insertError;
        }

        if (diff !== 0) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_qty')
            .eq('id', productId)
            .single();

          if (product) {
            const newQty = Math.max(0, (product.stock_qty || 0) - diff);
            await supabase
              .from('products')
              .update({ stock_qty: newQty })
              .eq('id', productId);
          }
        }

        const logMsg = `Stock rectifié : Le stock du produit ID ${productId} a été fixé à ${qty} (différence de ${diff}, stock central ajusté de -${diff}).`;
        await supabase
          .from('activity_log')
          .insert([{
            type: 'rectification',
            shop_id: shopId,
            product_id: productId,
            message: logMsg
          }]);

        return res.status(200).json({ status: 'success' });
      } else if (input.action === 'sell') {
        const shopId = parseInt(input.shop_id);
        const productId = parseInt(input.product_id);
        const qtySold = parseInt(input.qty_sold || input.qty || 1);
        const shopName = input.shop_name || 'Un shop';

        const { data: stock, error: stockError } = await supabase
          .from('shop_stock')
          .select('qty')
          .eq('shop_id', shopId)
          .eq('product_id', productId)
          .single();

        if (stockError || !stock || stock.qty < qtySold) {
          return res.status(200).json({ status: 'error', message: 'Stock insuffisant pour cette quantité' });
        }

        await supabase
          .from('shop_stock')
          .update({ qty: stock.qty - qtySold })
          .eq('shop_id', shopId)
          .eq('product_id', productId);

        const { data: prod } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .single();

        const prodName = prod ? prod.name : 'Produit inconnu';
        const msg = `Vente enregistrée : ${qtySold} unité(s) de '${prodName}' vendue(s) par le shop '${shopName}'.`;

        await supabase
          .from('activity_log')
          .insert([{
            type: 'sale_partner',
            shop_id: shopId,
            shop_name: shopName,
            product_id: productId,
            product_name: prodName,
            qty: qtySold,
            message: msg
          }]);

        await supabase
          .from('admin_notifications')
          .insert([{ shop_id: shopId, shop_name: shopName, message: msg }]);

        return res.status(200).json({ status: 'success' });
      }

      return res.status(200).json({});
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

function getQueryParam(req, param) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(param);
}
