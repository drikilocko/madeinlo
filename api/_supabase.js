const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars are missing');
}

export async function supabaseGet(table, query = {}) {
  const qs = new URLSearchParams();
  if (query.select) qs.set('select', query.select);
  if (query.order) qs.set('order', query.order);
  if (query.limit) qs.set('limit', String(query.limit));

  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${table} failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function supabasePost(table, payload) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase POST ${table} failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function supabasePatch(table, payload, match = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) {
    qs.set(k, `eq.${v}`);
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs.toString()}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${table} failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function supabaseDelete(table, match = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) {
    qs.set(k, `eq.${v}`);
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs.toString()}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase DELETE ${table} failed: ${res.status} ${text}`);
  }

  return true;
}
