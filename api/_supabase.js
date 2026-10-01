const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars are missing');
}

export async function supabaseGet(table, query = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(`Supabase env missing, returning empty array for GET ${table}`);
    return [];
  }

  const qs = new URLSearchParams();
  if (query.select) qs.set('select', query.select);
  if (query.order) qs.set('order', query.order);
  if (query.limit) qs.set('limit', String(query.limit));

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/rest/v1/${table}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Supabase GET ${table} failed: ${res.status} ${text}`);
      return [];
    }

    return await res.json();
  } catch (e) {
    console.error(`Supabase GET ${table} error:`, e.message);
    return [];
  }
}

export async function supabasePost(table, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/rest/v1/${table}`;

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

  return await res.json();
}

export async function supabasePatch(table, payload, match = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) {
    qs.set(k, `eq.${v}`);
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/rest/v1/${table}?${qs.toString()}`;

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

  return await res.json();
}

export async function supabaseDelete(table, match = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) {
    qs.set(k, `eq.${v}`);
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/rest/v1/${table}?${qs.toString()}`;

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
