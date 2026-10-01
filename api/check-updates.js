import { supabaseGet } from './_supabase.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const products = (await supabaseGet('products', {})) || [];
    const shopStock = (await supabaseGet('shop_stock', {})) || [];

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
      signature: 'default-fallback',
      warning: e.message || 'Database unavailable'
    });
  }
}
