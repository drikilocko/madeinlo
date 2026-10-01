import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const input = req.body || {};

    if (!input.action) {
      return res.status(400).json({ error: 'Action requise' });
    }

    if (input.action === 'login') {
      const login = input.login || '';
      const password = input.password || '';

      const shops = await supabaseGet('shops', {});
      const shop = shops.find(s => s.login === login);

      if (!shop) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }

      const valid = bcrypt.compareSync(password, shop.password);
      if (valid) {
        return res.status(200).json({
          status: 'success',
          shop: {
            id: shop.id,
            name: shop.name
          }
        });
      } else {
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
    } else if (input.action === 'check') {
      return res.status(401).json({ status: 'not_authenticated' });
    } else if (input.action === 'update_password') {
      const shopId = input.shop_id;
      const hashedPassword = bcrypt.hashSync(input.password, 10);

      await supabasePatch('shops', { password: hashedPassword }, { id: shopId });
      return res.status(200).json({ status: 'success' });
    } else if (input.action === 'logout') {
      return res.status(200).json({ status: 'logged_out' });
    }

    return res.status(400).json({ error: 'Action inconnue' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
