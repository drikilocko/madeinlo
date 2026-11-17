import { supabaseGet, supabasePatch } from './_supabase.js';
import bcrypt from 'bcryptjs';
import { parseJsonBody, setup, sendError, HttpError } from './_helpers.js';
import { signShopToken, getShop, checkRateLimit, recordFailure, resetAttempts, clientIp } from './_auth.js';

// Hash factice pour garder un temps de réponse constant quand l'identifiant n'existe pas
const DUMMY_HASH = bcrypt.hashSync('made-in-lo-dummy-password', 10);

function compare(password, hash) {
  // Les hash PHP ($2y$) sont compatibles avec bcryptjs une fois le préfixe adapté
  const normalized = String(hash || '').replace(/^\$2y\$/, '$2a$');
  try { return bcrypt.compareSync(password, normalized); } catch { return false; }
}

export default async function handler(req, res) {
  if (setup(req, res, ['POST'])) return;

  try {
    const input = await parseJsonBody(req);

    if (input.action === 'login') {
      const login = String(input.login || '').trim().slice(0, 60);
      const password = String(input.password || '').slice(0, 72);
      if (!login || !password) throw new HttpError(400, 'Identifiant et mot de passe requis');

      const ipKey = `shop-ip:${clientIp(req)}`;
      const loginKey = `shop-login:${login.toLowerCase()}`;
      checkRateLimit(ipKey, { max: 20 });
      checkRateLimit(loginKey, { max: 8 });

      const shop = (await supabaseGet('shops', { filter: { login: `eq.${login}` } }))[0];
      const valid = compare(password, shop ? shop.password : DUMMY_HASH);

      if (!shop || !valid) {
        recordFailure(ipKey);
        recordFailure(loginKey);
        throw new HttpError(401, 'Identifiants incorrects');
      }

      resetAttempts(loginKey);
      return res.status(200).json({
        status: 'success',
        token: signShopToken(shop),
        shop_id: shop.id,
        shop_name: shop.name
      });
    }

    if (input.action === 'check') {
      const shop = await getShop(req);
      if (!shop) return res.status(401).json({ status: 'not_authenticated' });
      return res.status(200).json({ status: 'success', shop_id: shop.id, shop_name: shop.name });
    }

    if (input.action === 'update_password') {
      // La boutique connectée change SON mot de passe, en confirmant l'ancien
      const shop = await getShop(req);
      if (!shop) throw new HttpError(401, 'Session expirée, reconnectez-vous');

      const current = String(input.current_password || '').slice(0, 72);
      const next = String(input.password || '');
      if (!compare(current, shop.password)) throw new HttpError(403, 'Mot de passe actuel incorrect');
      if (next.length < 8) throw new HttpError(400, 'Le nouveau mot de passe doit faire au moins 8 caractères');

      const hash = bcrypt.hashSync(next.slice(0, 72), 10);
      await supabasePatch('shops', { password: hash }, { id: shop.id });
      // Nouveau jeton : les anciennes sessions sont invalidées
      return res.status(200).json({ status: 'success', token: signShopToken({ ...shop, password: hash }) });
    }

    if (input.action === 'logout') {
      return res.status(200).json({ status: 'logged_out' });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
