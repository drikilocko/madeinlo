import { supabase } from './_supabase.js';
import { parsePrice, formatCurrency } from './_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('product_price, status');

    if (ordersError) throw ordersError;

    const totalOrders = orders.length;

    const completedOrders = orders.filter(o => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + parsePrice(o.product_price), 0);

    const { count: totalProducts, error: prodError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (prodError) throw prodError;

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('price, stock_qty, created_at');

    if (productsError) throw productsError;

    const totalStockValue = products.reduce((sum, p) => sum + (parsePrice(p.price) * (p.stock_qty || 0)), 0);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlyAddedValue = products.reduce((sum, p) => {
      if (!p.created_at) return sum;
      const created = new Date(p.created_at);
      if (created.getMonth() + 1 === currentMonth && created.getFullYear() === currentYear) {
        return sum + (parsePrice(p.price) * (p.stock_qty || 0));
      }
      return sum;
    }, 0);

    const { data: activityLogs, error: logError } = await supabase
      .from('activity_log')
      .select('product_id, qty')
      .eq('type', 'sale_partner');

    if (logError) throw logError;

    let partnerRevenue = 0;
    if (activityLogs.length > 0) {
      const productIds = [...new Set(activityLogs.map(l => l.product_id).filter(Boolean))];
      const { data: partnerProducts } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds);

      const productMap = new Map((partnerProducts || []).map(p => [p.id, parsePrice(p.price)]));
      partnerRevenue = activityLogs.reduce((sum, log) => {
        const price = productMap.get(log.product_id) || 0;
        return sum + (log.qty * price);
      }, 0);
    }

    const websiteRevenue = revenue;

    const { data: viewStats, error: viewError } = await supabase
      .from('products')
      .select('name, views')
      .order('views', { ascending: false })
      .limit(7);

    if (viewError) throw viewError;

    return res.status(200).json({
      revenue: formatCurrency(revenue),
      orders: totalOrders,
      inventory: totalProducts || 0,
      total_stock_value: totalStockValue,
      monthly_added_value: monthlyAddedValue,
      partner_revenue: partnerRevenue,
      website_revenue: websiteRevenue,
      view_stats: viewStats || []
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
