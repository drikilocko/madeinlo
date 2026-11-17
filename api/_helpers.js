export function parsePrice(str) {
  if (str === undefined || str === null) return 0;
  const num = parseFloat(String(str).replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function parseGallery(gallery) {
  let list = gallery;
  if (typeof gallery === 'string') {
    try { list = JSON.parse(gallery); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list.filter(u => typeof u === 'string' && isSafeUrl(u)).slice(0, 30);
}

export function formatCurrency(amount) {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

export function getQueryParam(req, param) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(param);
}

export async function parseJsonBody(req) {
  if (!req.body) return {};
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString('utf8')); } catch { return {}; }
  }
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

// En-têtes communs + gestion OPTIONS. Retourne true si la requête est terminée.
// Pas de CORS "*" : l'API n'est appelée que depuis le site lui-même.
export function setup(req, res, methods = ['GET', 'POST']) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '));
    res.status(204).end();
    return true;
  }
  if (!methods.includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return true;
  }
  return false;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Réponse d'erreur sans fuite de détails internes (les détails vont dans les logs Vercel)
export function sendError(res, e) {
  if (e instanceof HttpError) {
    return res.status(e.status).json({ error: e.message });
  }
  console.error('API error:', e && e.stack ? e.stack : e);
  return res.status(500).json({ error: 'Erreur interne du serveur' });
}

// Texte saisi par un utilisateur : on retire les caractères HTML dangereux et on limite la taille.
// (L'apostrophe est conservée pour le français ; l'affichage côté admin échappe aussi le HTML.)
export function cleanText(value, max = 200, { multiline = false } = {}) {
  if (value === undefined || value === null) return '';
  let s = String(value).replace(/[<>"`\\]/g, '');
  s = multiline
    ? s.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    : s.replace(/[\u0000-\u001f\u007f]/g, ' ');
  return s.trim().slice(0, max);
}

export function toInt(value, { min = -Infinity, max = Infinity } = {}) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function requireInt(value, name, opts = { min: 1 }) {
  const n = toInt(value, opts);
  if (n === null) throw new HttpError(400, `Paramètre invalide : ${name}`);
  return n;
}

export function toIdList(value, max = 500) {
  if (!Array.isArray(value)) throw new HttpError(400, 'Liste d\'identifiants invalide');
  const ids = value.map(v => toInt(v, { min: 1 })).filter(v => v !== null);
  if (ids.length === 0) throw new HttpError(400, 'Aucun identifiant fourni');
  return ids.slice(0, max);
}

// URL d'image autorisée : chemin relatif du site ou https
export function isSafeUrl(url) {
  if (typeof url !== 'string' || url.length > 1000) return false;
  if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return true;
  return /^[a-zA-Z0-9_\-./]+$/.test(url) && !url.includes('..');
}

export function cleanUrl(url) {
  return isSafeUrl(url) ? url : '';
}
