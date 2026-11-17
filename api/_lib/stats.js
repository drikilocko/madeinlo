import { supabaseGet } from './_supabase.js';
import { parsePrice, formatCurrency, setup, sendError } from './_helpers.js';
import { requireAdmin } from './_auth.js';

export default async function handler(req, res) {
  if (setup(req, res, ['GET'])) return;

  try {
    await requireAdmin(req);

    const allOrders = await supabaseGet('orders', { select: 'product_price,status,payment_status,amount' });
    // Commandes valides : payées via PayDunya, ou anciennes commandes (sans suivi de paiement) non annulées
    const orders = allOrders.filter(o => o.payment_status === 'paid' || (!o.payment_status && o.status !== 'cancelled'));
    const totalOrders = orders.length;

    const revenue = orders.reduce((sum, o) => {
      if (o.payment_status === 'paid') return sum + (Number(o.amount) || parsePrice(o.product_price));
      return ['completed', 'delivered'].includes(o.status) ? sum + parsePrice(o.product_price) : sum;
    }, 0);

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

    const salePartnerLogs = await supabaseGet('activity_log', { select: 'product_id,qty', filter: { type: 'eq.sale_partner' } });

    let partnerRevenue = 0;
    if (salePartnerLogs.length > 0) {
      const productMap = new Map(products.map(p => [p.id, parsePrice(p.price)]));
      partnerRevenue = salePartnerLogs.reduce((sum, log) => {
        const price = productMap.get(log.product_id) || 0;
        return sum + ((log.qty || 0) * price);
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
    return sendError(res, e);
  }
}
