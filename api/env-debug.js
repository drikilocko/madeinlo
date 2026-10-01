export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.SUPABASE_URL || null;
  const key = process.env.SUPABASE_ANON_KEY || null;

  res.status(200).json({
    url,
    keyPresent: Boolean(key),
    keyLength: key ? key.length : 0
  });
}
