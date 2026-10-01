import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';

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

      const products = await supabaseGet('products', {});
      const zeroStockProducts = products.filter(p => (p.stock_qty || 0) <= 0);

      if (zeroStockProducts.length > 0) {
        const ids = zeroStockProducts.map(p => p.id);
        const shopStocks = await supabaseGet('shop_stock', {});
        for (const ss of shopStocks) {
          if (ids.includes(ss.product_id)) {
            await supabasePatch('shop_stock', { qty: 0 }, { id: ss.id });
          }
        }

        const stockShipments = await supabaseGet('stock_shipments', {});
        for (const shipment of stockShipments) {
          if (ids.includes(shipment.product_id) && shipment.status === 'pending') {
            await supabasePatch('stock_shipments', { status: 'accepted' }, { id: shipment.id });
          }
        }
      }

      if (shopId) {
        if (type === 'stock') {
          const shopStockData = await supabaseGet('shop_stock', {});
          const filtered = shopStockData.filter(ss => ss.shop_id === shopId);
          return res.status(200).json(filtered || []);
        } else {
          const stockShipments = await supabaseGet('stock_shipments', {});
          const pending = stockShipments.filter(ss => ss.shop_id === shopId && ss.status === 'pending');

          const grouped = new Map();
          for (const row of pending) {
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

        const products = await supabaseGet('products', {});
        const product = products.find(p => p.id === productId);

        if (!product) {
          return res.status(200).json({ status: 'error', message: 'Produit non trouvé' });
        }

        if ((product.stock_qty || 0) < qty) {
          return res.status(200).json({ status: 'error', message: `Stock central insuffisant (Max disponible : ${product.stock_qty})` });
        }

        const shops = await supabaseGet('shops', {});
        const shop = shops.find(s => s.id === shopId);

        if (!shop) {
          return res.status(200).json({ status: 'error', message: 'Shop non trouvé' });
        }

        await supabasePatch('products', { stock_qty: (product.stock_qty || 0) - qty }, { id: productId });
        await supabasePost('stock_shipments', [{ shop_id: shopId, product_id: productId, qty, status: 'pending' }]);

        const logMsg = `Envoi de stock en attente : ${qty} unité(s) de '${product.name}' expédiée(s) à '${shop.name}'.`;
        await supabasePost('activity_log', [{
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

        const stockShipments = await supabaseGet('stock_shipments', {});
        const refShip = stockShipments.find(s => s.id === shipmentId && s.status === 'pending');

        if (!refShip) {
          return res.status(200).json({ status: 'error', message: 'Expédition non trouvée' });
        }

        const shopId = refShip.shop_id;
        const productId = refShip.product_id;

        const pendingShipments = stockShipments.filter(s => s.shop_id === shopId && s.product_id === productId && s.status === 'pending');
        const totalQty = pendingShipments.reduce((sum, s) => sum + (s.qty || 0), 0);

        if (totalQty > 0) {
          const shopStocks = await supabaseGet('shop_stock', {});
          const existing = shopStocks.find(ss => ss.shop_id === shopId && ss.product_id === productId);

          if (existing) {
            await supabasePatch('shop_stock', { qty: (existing.qty || 0) + totalQty }, { id: existing.id });
          } else {
            await supabasePost('shop_stock', [{ shop_id: shopId, product_id: productId, qty: totalQty }]);
          }

          const matchingShipments = stockShipments.filter(s => s.shop_id === shopId && s.product_id === productId && s.status === 'pending');
          for (const shipment of matchingShipments) {
            await supabasePatch('stock_shipments', { status: 'accepted' }, { id: shipment.id });
          }

          const logMsg = `Réception confirmée : Le shop a accepté toutes les expéditions en attente pour ce produit (Total: ${totalQty} unités).`;
          await supabasePost('activity_log', [{
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

        const shopStocks = await supabaseGet('shop_stock', {});
        const existing = shopStocks.find(ss => ss.shop_id === shopId && ss.product_id === productId);

        let oldQty = 0;
        if (existing) {
          oldQty = existing.qty || 0;
        }

        if (existing) {
          await supabasePatch('shop_stock', { qty }, { id: existing.id });
        } else {
          await supabasePost('shop_stock', [{ shop_id: shopId, product_id: productId, qty }]);
        }

        const diff = qty - oldQty;

        if (diff !== 0) {
          const products = await supabaseGet('products', {});
          const product = products.find(p => p.id === productId);

          if (product) {
            const newQty = Math.max(0, (product.stock_qty || 0) - diff);
            await supabasePatch('products', { stock_qty: newQty }, { id: productId });
          }
        }

        const logMsg = `Stock rectifié : Le stock du produit ID ${productId} a été fixé à ${qty} (différence de ${diff}, stock central ajusté de -${diff}).`;
        await supabasePost('activity_log', [{
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

        const shopStocks = await supabaseGet('shop_stock', {});
        const stock = shopStocks.find(ss => ss.shop_id === shopId && ss.product_id === productId);

        if (!stock || stock.qty < qtySold) {
          return res.status(200).json({ status: 'error', message: 'Stock insuffisant pour cette quantité' });
        }

        await supabasePatch('shop_stock', { qty: stock.qty - qtySold }, { shop_id: shopId, product_id });

        const products = await supabaseGet('products', {});
        const prod = products.find(p => p.id === productId);
        const prodName = prod ? prod.name : 'Produit inconnu';
        const msg = `Vente enregistrée : ${qtySold} unité(s) de '${prodName}' vendue(s) par le shop '${shopName}'.`;

        await supabasePost('activity_log', [{
          type: 'sale_partner',
          shop_id: shopId,
          shop_name: shopName,
          product_id: productId,
          product_name: prodName,
          qty: qtySold,
          message: msg
        }]);

        await supabasePost('admin_notifications', [{ shop_id: shopId, shop_name: shopName, message: msg }]);

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
