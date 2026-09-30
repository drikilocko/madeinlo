export function parsePrice(str) {
  if (!str) return 0;
  const num = parseFloat(str.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function parseGallery(gallery) {
  if (Array.isArray(gallery)) return gallery;
  if (typeof gallery === 'string') {
    try { return JSON.parse(gallery); } catch { return []; }
  }
  return [];
}

export function formatCurrency(amount) {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

export function getQueryParam(req, param) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(param);
}
