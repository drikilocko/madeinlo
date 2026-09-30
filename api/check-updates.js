import { supabase } from './_supabase.js';
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
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('stock_qty, id');

    if (productsError) throw productsError;

    const { data: shopStock, error: shopStockError } = await supabase
      .from('shop_stock')
      .select('qty');

    if (shopStockError) throw shopStockError;

    const cnt = (products || []).length;
    const stockSum = (products || []).reduce((sum, p) => sum + (p.stock_qty || 0), 0);
    const maxId = (products || []).length > 0 ? Math.max(...(products || []).map(p => p.id)) : 0;
    const ssCnt = (shopStock || []).length;
    const ssStockSum = (shopStock || []).reduce((sum, s) => sum + (s.qty || 0), 0);

    const signature = crypto.createHash('md5').update(`${cnt}-${stockSum}-${maxId}-${ssCnt}-${ssStockSum}`).digest('hex');

    return res.status(200).json({
      status: 'success',
      signature
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e.message || 'Internal server error'
    });
  }
}
