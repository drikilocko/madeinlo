import crypto from 'crypto';
import { supabaseConfig, supabaseGet } from './_supabase.js';
import { HttpError } from './_helpers.js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const SHOP_TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 h

function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------------------
// ADMIN : session Supabase Auth (JWT) + liste blanche d'emails / rôle admin
// ---------------------------------------------------------------------------
const adminCache = new Map(); // token -> { user, until }

export function isAdminUser(user) {
  if (!user) return false;
  if (user.app_metadata && user.app_metadata.role === 'admin') return true;
  return !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function fetchSupabaseUser(token) {
  const { url, anonKey, serviceKey } = supabaseConfig();
  if (!url || !(anonKey || serviceKey)) throw new HttpError(503, 'Authentification non configurée');
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey || serviceKey, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function getAdmin(req) {
  const token = bearer(req);
  if (!token || token.split('.').length !== 3) return null;

  const cached = adminCache.get(token);
  if (cached && cached.until > Date.now()) return cached.user;

  const user = await fetchSupabaseUser(token);
  if (!isAdminUser(user)) return null;

  adminCache.set(token, { user, until: Date.now() + 60 * 1000 });
  if (adminCache.size > 200) adminCache.delete(adminCache.keys().next().value);
  return user;
}

export async function requireAdmin(req) {
  const admin = await getAdmin(req);
  if (!admin) throw new HttpError(401, 'Authentification administrateur requise');
  return admin;
}

// ---------------------------------------------------------------------------
// PARTENAIRES : jeton signé HMAC { sid, pv, exp }
// pv = empreinte du hash du mot de passe -> changer le mot de passe invalide les sessions
// ---------------------------------------------------------------------------
function sessionSecret() {
  const explicit = (process.env.SESSION_SECRET || '').trim();
  if (explicit.length >= 32) return explicit;
  const { serviceKey } = supabaseConfig();
  if (!serviceKey) throw new HttpError(503, 'Sessions non configurées');
  return crypto.createHash('sha256').update('made-in-lo-shop-session:' + serviceKey).digest('hex');
}

const b64url = buf => Buffer.from(buf).toString('base64url');

export function passwordVersion(hash) {
  return crypto.createHash('sha256').update(String(hash || '')).digest('base64url').slice(0, 16);
}

export function signShopToken(shop) {
  const payload = b64url(JSON.stringify({
    sid: shop.id,
    pv: passwordVersion(shop.password),
    exp: Math.floor(Date.now() / 1000) + SHOP_TOKEN_TTL_SECONDS
  }));
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyShopTokenString(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getShop(req) {
  const token = bearer(req);
  if (!token || token.split('.').length !== 2) return null;
  const data = verifyShopTokenString(token);
  if (!data) return null;
  const rows = await supabaseGet('shops', { filter: { id: `eq.${parseInt(data.sid, 10)}` } });
  const shop = rows[0];
  if (!shop || passwordVersion(shop.password) !== data.pv) return null;
  return shop;
}

// Admin OU partenaire. Pour un partenaire, shopId est forcé à sa propre boutique.
export async function requireAdminOrShop(req) {
  const token = bearer(req);
  if (token.split('.').length === 3) {
    const admin = await getAdmin(req);
    if (admin) return { role: 'admin', user: admin };
  } else if (token) {
    const shop = await getShop(req);
    if (shop) return { role: 'shop', shop };
  }
  throw new HttpError(401, 'Authentification requise');
}

// ---------------------------------------------------------------------------
// Limitation des tentatives (best effort, en mémoire par instance serverless)
// ---------------------------------------------------------------------------
const attempts = new Map();

export function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'] || '';
  return String(fwd).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

export function checkRateLimit(key, { max = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 0, reset: now + windowMs });
    return;
  }
  if (entry.count >= max) {
    throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  }
}

export function recordFailure(key) {
  const entry = attempts.get(key);
  if (entry) entry.count++;
}

export function resetAttempts(key) {
  attempts.delete(key);
}
