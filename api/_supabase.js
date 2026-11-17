// Accès serveur à Supabase.
// La clé SERVICE_ROLE ne quitte jamais le serveur : elle contourne le RLS,
// qui bloque tout accès direct avec la clé publique (anon).
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const STORAGE_BUCKET = 'products';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase env vars are missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
}

export function supabaseConfig() {
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, serviceKey: SUPABASE_SERVICE_KEY };
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }
}

function serviceHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

function matchQuery(match) {
  const qs = new URLSearchParams();
  const entries = Object.entries(match);
  if (entries.length === 0) {
    // Garde-fou : jamais de PATCH/DELETE sur toute une table
    throw new Error('Refusing to modify a table without a filter');
  }
  for (const [k, v] of entries) {
    if (v === undefined || v === null || v === '') throw new Error(`Missing value for filter ${k}`);
    qs.set(k, `eq.${v}`);
  }
  return qs;
}

export async function supabaseGet(table, query = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn(`Supabase env missing, returning empty array for GET ${table}`);
    return [];
  }

  const qs = new URLSearchParams();
  if (query.select) qs.set('select', query.select.replace(/\s+/g, ''));
  if (query.order) qs.set('order', query.order);
  if (query.limit) qs.set('limit', String(query.limit));
  // Filtres PostgREST : { filter: { is_visible: 'eq.true' } }
  if (query.filter) {
    for (const [col, val] of Object.entries(query.filter)) qs.set(col, val);
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs.toString()}`, { headers: serviceHeaders() });
    if (!res.ok) {
      console.error(`Supabase GET ${table} failed: ${res.status} ${await res.text()}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`Supabase GET ${table} error:`, e.message);
    return [];
  }
}

export async function supabasePost(table, payload) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: serviceHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Supabase POST ${table} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

export async function supabasePatch(table, payload, match = {}) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchQuery(match).toString()}`, {
    method: 'PATCH',
    headers: serviceHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

export async function supabaseDelete(table, match = {}) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchQuery(match).toString()}`, {
    method: 'DELETE',
    headers: serviceHeaders()
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${table} failed: ${res.status} ${await res.text()}`);
  return true;
}

// Upload d'un fichier dans Supabase Storage (bucket public "products")
export async function storageUpload(path, buffer, contentType) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'false',
      'cache-control': '31536000'
    },
    body: buffer
  });
  if (!res.ok) throw new Error(`Supabase storage upload failed: ${res.status} ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
