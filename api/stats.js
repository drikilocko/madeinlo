import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
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
    const orders = await supabaseGet('orders', { select: 'product_price, status' });
    const totalOrders = orders.length;

    const completedOrders = orders.filter(o => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + parsePrice(o.product_price), 0);

    const products = await supabaseGet('products', {});
    const totalProducts = products.length;

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

    const activityLogs = await supabaseGet('activity_log', {});
    const salePartnerLogs = activityLogs.filter(l => l.type === 'sale_partner');

    let partnerRevenue = 0;
    if (salePartnerLogs.length > 0) {
      const productIds = [...new Set(salePartnerLogs.map(l => l.product_id).filter(Boolean))];
      const partnerProducts = await supabaseGet('products', { select: 'id, price' });
      const productMap = new Map((partnerProducts || []).map(p => [p.id, parsePrice(p.price)]));
      partnerRevenue = salePartnerLogs.reduce((sum, log) => {
        const price = productMap.get(log.product_id) || 0;
        return sum + (log.qty * price);
      }, 0);
    }

    const websiteRevenue = revenue;

    const viewStats = await supabaseGet('products', { select: 'name, views', order: 'views.desc', limit: 7 });

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
