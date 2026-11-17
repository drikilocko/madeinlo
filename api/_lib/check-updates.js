import { supabaseGet } from './_supabase.js';
import crypto from 'crypto';
import { setup } from './_helpers.js';

export default async function handler(req, res) {
  if (setup(req, res, ['GET'])) return;

  try {
    const products = (await supabaseGet('products', { select: 'id,stock_qty' })) || [];
    const shopStock = (await supabaseGet('shop_stock', { select: 'qty' })) || [];

    const productsArr = Array.isArray(products) ? products : [];
    const shopStockArr = Array.isArray(shopStock) ? shopStock : [];

    const cnt = productsArr.length;
    const stockSum = productsArr.reduce((sum, p) => sum + (p.stock_qty || 0), 0);
    const maxId = productsArr.length > 0 ? Math.max(...productsArr.map(p => p.id || 0)) : 0;
    const ssCnt = shopStockArr.length;
    const ssStockSum = shopStockArr.reduce((sum, s) => sum + (s.qty || 0), 0);

    const signature = crypto.createHash('md5').update(`${cnt}-${stockSum}-${maxId}-${ssCnt}-${ssStockSum}`).digest('hex');

    return res.status(200).json({
      status: 'success',
      signature
    });
  } catch (e) {
    console.error('Check updates handler error:', e.message);
    return res.status(200).json({
      status: 'success',
      signature: 'default-fallback'
    });
  }
}
