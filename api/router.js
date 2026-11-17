// Point d'entrée unique de l'API (1 seule fonction Vercel au lieu d'une par fichier).
// Le plan Vercel Hobby limite à 12 fonctions : toutes les routes /api/<nom> sont
// redirigées ici par vercel.json, puis distribuées vers api/_lib/<nom>.js.
import adminAuth from './_lib/admin-auth.js';
import categories from './_lib/categories.js';
import checkUpdates from './_lib/check-updates.js';
import history from './_lib/history.js';
import notifications from './_lib/notifications.js';
import orders from './_lib/orders.js';
import paydunyaIpn from './_lib/paydunya-ipn.js';
import payment from './_lib/payment.js';
import ping from './_lib/ping.js';
import products from './_lib/products.js';
import shopAuth from './_lib/shop-auth.js';
import shopStock from './_lib/shop-stock.js';
import shops from './_lib/shops.js';
import stats from './_lib/stats.js';
import track from './_lib/track.js';

const ROUTES = {
  'admin-auth': adminAuth,
  categories,
  'check-updates': checkUpdates,
  history,
  notifications,
  orders,
  'paydunya-ipn': paydunyaIpn,
  payment,
  ping,
  products,
  'shop-auth': shopAuth,
  'shop-stock': shopStock,
  shops,
  stats,
  track
};

export function routeName(req) {
  const url = new URL(req.url || '/', 'http://localhost');
  // Ajouté par la réécriture de vercel.json ; sinon on lit le chemin d'origine
  const fromQuery = url.searchParams.get('__route');
  const fromPath = url.pathname.replace(/^\/api\//, '').replace(/\.php$/, '').split('/')[0];
  return (fromQuery || fromPath || '').toLowerCase();
}

export default async function handler(req, res) {
  const name = routeName(req);
  const route = Object.prototype.hasOwnProperty.call(ROUTES, name) ? ROUTES[name] : null;
  if (!route) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ error: 'Route API inconnue' });
  }
  return route(req, res);
}
