import { supabaseGet, supabasePost, supabasePatch } from './_supabase.js';
import { getQueryParam, parseJsonBody, setup, sendError, HttpError, requireInt, toInt } from './_helpers.js';
import { requireAdmin, requireAdminOrShop } from './_auth.js';

async function productMap(ids) {
  if (ids.length === 0) return new Map();
  const unique = [...new Set(ids)].join(',');
  const rows = await supabaseGet('products', {
    select: 'id,name,price,image_url,category,stock_qty',
    filter: { id: `in.(${unique})` }
  });
  return new Map(rows.map(p => [p.id, p]));
}

function withProduct(row, map) {
  const p = map.get(row.product_id) || {};
  return { ...row, name: p.name || 'Produit supprimé', price: p.price || '0', image_url: p.image_url || 'img/placeholder.png', category: p.category || '' };
}

async function getShopById(id) {
  return (await supabaseGet('shops', { select: 'id,name', filter: { id: `eq.${id}` } }))[0] || null;
}

async function getShopStock(shopId, productId) {
  return (await supabaseGet('shop_stock', {
    filter: { shop_id: `eq.${shopId}`, product_id: `eq.${productId}` }
  }))[0] || null;
}

export default async function handler(req, res) {
  if (setup(req, res)) return;

  try {
    if (req.method === 'GET') {
      const auth = await requireAdminOrShop(req);
      // Un partenaire ne voit QUE sa boutique, quel que soit le paramètre envoyé
      const shopId = auth.role === 'shop' ? auth.shop.id : toInt(getQueryParam(req, 'shop_id'), { min: 1 });
      if (!shopId) return res.status(200).json([]);
      const type = getQueryParam(req, 'type') || 'stock';

      if (type === 'stock') {
        const rows = await supabaseGet('shop_stock', { filter: { shop_id: `eq.${shopId}` } });
        const map = await productMap(rows.map(r => r.product_id));
        return res.status(200).json(rows.map(r => withProduct(r, map)));
      }

      const pending = await supabaseGet('stock_shipments', {
        filter: { shop_id: `eq.${shopId}`, status: 'eq.pending' }
      });
      const grouped = new Map();
      for (const row of pending) {
        if (!grouped.has(row.product_id)) {
          grouped.set(row.product_id, { id: row.id, shop_id: row.shop_id, product_id: row.product_id, qty: 0, status: row.status });
        }
        grouped.get(row.product_id).qty += row.qty || 0;
      }
      const map = await productMap([...grouped.keys()]);
      return res.status(200).json([...grouped.values()].map(r => withProduct(r, map)));
    }

    const input = await parseJsonBody(req);

    if (input.action === 'assign') {
      await requireAdmin(req);
      const shopId = requireInt(input.shop_id, 'shop_id');
      const productId = requireInt(input.product_id, 'product_id');
      const qty = requireInt(input.qty, 'qty', { min: 1, max: 100000 });

      const product = (await productMap([productId])).get(productId);
      if (!product) return res.status(200).json({ status: 'error', message: 'Produit non trouvé' });
      if ((product.stock_qty || 0) < qty) {
        return res.status(200).json({ status: 'error', message: `Stock central insuffisant (Max disponible : ${product.stock_qty || 0})` });
      }
      const shop = await getShopById(shopId);
      if (!shop) return res.status(200).json({ status: 'error', message: 'Shop non trouvé' });

      await supabasePatch('products', { stock_qty: (product.stock_qty || 0) - qty }, { id: productId });
      await supabasePost('stock_shipments', [{ shop_id: shopId, product_id: productId, qty, status: 'pending' }]);
      await supabasePost('activity_log', [{
        type: 'assignment',
        shop_id: shopId,
        shop_name: shop.name,
        product_id: productId,
        product_name: product.name,
        qty,
        message: `Envoi de stock en attente : ${qty} unité(s) de '${product.name}' expédiée(s) à '${shop.name}'.`
      }]);
      return res.status(200).json({ status: 'success' });
    }

    if (input.action === 'accept_shipment') {
      const auth = await requireAdminOrShop(req);
      const shipmentId = requireInt(input.id, 'id');

      const ref = (await supabaseGet('stock_shipments', { filter: { id: `eq.${shipmentId}`, status: 'eq.pending' } }))[0];
      if (!ref) return res.status(200).json({ status: 'error', message: 'Expédition non trouvée' });
      if (auth.role === 'shop' && ref.shop_id !== auth.shop.id) throw new HttpError(403, 'Accès refusé');

      const pending = await supabaseGet('stock_shipments', {
        filter: { shop_id: `eq.${ref.shop_id}`, product_id: `eq.${ref.product_id}`, status: 'eq.pending' }
      });
      const totalQty = pending.reduce((sum, s) => sum + (s.qty || 0), 0);
      if (totalQty <= 0) return res.status(200).json({ status: 'error', message: 'Aucune expédition en attente pour ce produit' });

      // On marque d'abord les envois comme acceptés pour éviter un double ajout
      for (const shipment of pending) {
        await supabasePatch('stock_shipments', { status: 'accepted' }, { id: shipment.id });
      }
      const existing = await getShopStock(ref.shop_id, ref.product_id);
      if (existing) {
        await supabasePatch('shop_stock', { qty: (existing.qty || 0) + totalQty, last_update: new Date().toISOString() }, { id: existing.id });
      } else {
        await supabasePost('shop_stock', [{ shop_id: ref.shop_id, product_id: ref.product_id, qty: totalQty }]);
      }
      await supabasePost('activity_log', [{
        type: 'assignment',
        shop_id: ref.shop_id,
        product_id: ref.product_id,
        qty: totalQty,
        message: `Réception confirmée : Le shop a accepté toutes les expéditions en attente pour ce produit (Total: ${totalQty} unités).`
      }]);
      return res.status(200).json({ status: 'success' });
    }

    if (input.action === 'rectify') {
      await requireAdmin(req);
      const shopId = requireInt(input.shop_id, 'shop_id');
      const productId = requireInt(input.product_id, 'product_id');
      const qty = requireInt(input.qty, 'qty', { min: 0, max: 100000 });

      const existing = await getShopStock(shopId, productId);
      const oldQty = existing ? existing.qty || 0 : 0;
      if (existing) {
        await supabasePatch('shop_stock', { qty, last_update: new Date().toISOString() }, { id: existing.id });
      } else {
        await supabasePost('shop_stock', [{ shop_id: shopId, product_id: productId, qty }]);
      }

      const diff = qty - oldQty;
      if (diff !== 0) {
        const product = (await productMap([productId])).get(productId);
        if (product) {
          await supabasePatch('products', { stock_qty: Math.max(0, (product.stock_qty || 0) - diff) }, { id: productId });
        }
      }
      await supabasePost('activity_log', [{
        type: 'rectification',
        shop_id: shopId,
        product_id: productId,
        message: `Stock rectifié : Le stock du produit ID ${productId} a été fixé à ${qty} (différence de ${diff}, stock central ajusté de ${-diff}).`
      }]);
      return res.status(200).json({ status: 'success' });
    }

    if (input.action === 'sell') {
      const auth = await requireAdminOrShop(req);
      const shopId = auth.role === 'shop' ? auth.shop.id : requireInt(input.shop_id, 'shop_id');
      const productId = requireInt(input.product_id, 'product_id');
      const qtySold = requireInt(input.qty_sold ?? input.qty ?? 1, 'qty', { min: 1, max: 10000 });

      const stock = await getShopStock(shopId, productId);
      if (!stock || (stock.qty || 0) < qtySold) {
        return res.status(200).json({ status: 'error', message: 'Stock insuffisant pour cette quantité' });
      }
      await supabasePatch('shop_stock', { qty: stock.qty - qtySold, last_update: new Date().toISOString() }, { id: stock.id });

      const shop = auth.role === 'shop' ? auth.shop : await getShopById(shopId);
      const shopName = shop ? shop.name : 'Un shop';
      const product = (await productMap([productId])).get(productId);
      const prodName = product ? product.name : 'Produit inconnu';
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

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
