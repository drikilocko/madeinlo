// Connexion administrateur via Supabase Auth (email + mot de passe).
// Le navigateur ne voit jamais les clés Supabase : il reçoit seulement un jeton de session.
import { supabaseConfig } from './_supabase.js';
import { setup, sendError, parseJsonBody, HttpError } from './_helpers.js';
import { isAdminUser, getAdmin, checkRateLimit, recordFailure, resetAttempts, clientIp } from './_auth.js';

async function authRequest(path, body) {
  const { url, anonKey, serviceKey } = supabaseConfig();
  if (!url || !(anonKey || serviceKey)) throw new HttpError(503, 'Authentification non configurée');
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: anonKey || serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function sessionPayload(data) {
  return {
    status: 'success',
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    email: data.user?.email || ''
  };
}

export default async function handler(req, res) {
  if (setup(req, res, ['POST'])) return;

  try {
    const input = await parseJsonBody(req);

    if (input.action === 'login') {
      const email = String(input.email || '').trim().toLowerCase().slice(0, 200);
      const password = String(input.password || '').slice(0, 200);
      if (!email || !password) throw new HttpError(400, 'Email et mot de passe requis');

      const key = `admin:${clientIp(req)}`;
      checkRateLimit(key);

      const { ok, data } = await authRequest('token?grant_type=password', { email, password });
      if (!ok || !isAdminUser(data.user)) {
        recordFailure(key);
        throw new HttpError(401, 'Identifiants incorrects');
      }
      resetAttempts(key);
      return res.status(200).json(sessionPayload(data));
    }

    if (input.action === 'refresh') {
      const refreshToken = String(input.refresh_token || '');
      if (!refreshToken) throw new HttpError(400, 'Jeton manquant');
      const { ok, data } = await authRequest('token?grant_type=refresh_token', { refresh_token: refreshToken });
      if (!ok || !isAdminUser(data.user)) throw new HttpError(401, 'Session expirée');
      return res.status(200).json(sessionPayload(data));
    }

    if (input.action === 'me') {
      const admin = await getAdmin(req);
      if (!admin) throw new HttpError(401, 'Non connecté');
      return res.status(200).json({ status: 'success', email: admin.email });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
