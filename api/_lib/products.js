import { supabaseGet, supabasePost, supabasePatch, supabaseDelete, storageUpload } from './_supabase.js';
import {
  parseGallery, getQueryParam, parseJsonBody, setup, sendError, HttpError,
  cleanText, cleanUrl, toInt, requireInt, toIdList
} from './_helpers.js';
import { requireAdmin } from './_auth.js';
import crypto from 'crypto';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 Mo (limite Vercel : 4,5 Mo par requête)
const IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg', magic: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  'image/webp': { ext: 'webp', magic: b => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  'image/gif': { ext: 'gif', magic: b => b.slice(0, 3).toString() === 'GIF' }
};

function productFields(p) {
  const fields = {
    name: cleanText(p.name, 150),
    description: cleanText(p.description, 3000, { multiline: true }),
    price: cleanText(p.price, 30),
    image_url: cleanUrl(p.image_url || ''),
    category: cleanText(p.category, 80) || 'General',
    gallery: parseGallery(p.gallery),
    stock_qty: toInt(p.stock_qty, { min: 0, max: 1000000 }) ?? 0
  };
  if (!fields.name) throw new HttpError(400, 'Le nom du produit est requis');
  return fields;
}

async function getProduct(id) {
  const rows = await supabaseGet('products', { filter: { id: `eq.${id}` } });
  return rows[0] || null;
}

export default async function handler(req, res) {
  if (setup(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Liste complète (produits masqués inclus) réservée à l'admin
      if (getQueryParam(req, 'admin') === '1') {
        await requireAdmin(req);
        const data = await supabaseGet('products', { order: 'category.asc,created_at.desc' });
        return res.status(200).json(data);
      }

      const data = await supabaseGet('products', {
        order: 'category.asc,created_at.desc',
        filter: { is_visible: 'eq.true' }
      });
      return res.status(200).json(data);
    }

    // POST
    const input = await parseJsonBody(req);
    const action = input.action;
    if (!action) throw new HttpError(400, 'Action requise');

    // Seule action publique : compteur de vues
    if (action === 'increment_view') {
      const id = toInt(input.id, { min: 1 });
      if (id === null) return res.status(200).json({ status: 'ignored' });
      const product = await getProduct(id);
      if (product) await supabasePatch('products', { views: (product.views || 0) + 1 }, { id });
      return res.status(200).json({ status: 'success' });
    }

    // Tout le reste : admin uniquement
    await requireAdmin(req);

    if (action === 'upload_image') {
      const type = IMAGE_TYPES[input.content_type];
      if (!type) throw new HttpError(400, 'Format non autorisé (JPEG, PNG, WebP ou GIF uniquement)');
      const base64 = String(input.data || '').replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length === 0) throw new HttpError(400, 'Fichier vide');
      if (buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image trop lourde (3 Mo maximum)');
      if (!type.magic(buffer)) throw new HttpError(400, 'Le contenu ne correspond pas à une image valide');

      const path = `${new Date().toISOString().slice(0, 7)}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${type.ext}`;
      const url = await storageUpload(path, buffer, input.content_type);
      return res.status(200).json({ status: 'success', url });
    }

    if (action === 'add') {
      const fields = productFields(input.product || input);
      const data = await supabasePost('products', fields);
      return res.status(200).json({ status: 'success', id: data[0].id });
    }

    if (action === 'edit') {
      const p = input.product || input;
      const id = requireInt(p.id ?? input.id, 'id');
      await supabasePatch('products', productFields(p), { id });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'delete') {
      await supabaseDelete('products', { id: requireInt(input.id, 'id') });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'bulk_add') {
      const count = toInt(input.count, { min: 1, max: 500 }) ?? 100;
      const rows = await supabaseGet('products', { select: 'image_url' });
      let maxNum = 0;
      for (const row of rows) {
        const match = row.image_url?.match(/(\d+)\.(webp|png|jpg)$/i);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
      const products = [];
      for (let i = 1; i <= count; i++) {
        const n = maxNum + i;
        products.push({ name: `nom${n}`, description: '', price: '0', image_url: `produit/${n}.webp`, category: 'Hauts' });
      }
      await supabasePost('products', products);
      return res.status(200).json({ status: 'success', added: count });
    }

    if (action === 'merge' || action === 'bulk_merge') {
      const targetId = requireInt(input.target_id, 'target_id');
      const sourceIds = action === 'merge'
        ? [requireInt(input.source_id, 'source_id')]
        : toIdList(input.source_ids);
      if (sourceIds.includes(targetId)) throw new HttpError(400, 'Un produit ne peut pas fusionner avec lui-même');

      const target = await getProduct(targetId);
      if (!target) throw new HttpError(404, 'Produit cible introuvable');

      const gallery = parseGallery(target.gallery);
      const sources = [];
      for (const sid of sourceIds) {
        const source = await getProduct(sid);
        if (!source) continue;
        sources.push(sid);
        for (const img of [source.image_url, ...parseGallery(source.gallery)]) {
          if (img && !gallery.includes(img)) gallery.push(img);
        }
      }
      if (sources.length === 0) throw new HttpError(404, 'Produit source introuvable');

      await supabasePatch('products', { gallery }, { id: targetId });
      for (const sid of sources) await supabaseDelete('products', { id: sid });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'unmerge') {
      const parentId = requireInt(input.parent_id, 'parent_id');
      const imageUrl = cleanUrl(input.image_url);
      const parent = await getProduct(parentId);
      if (!parent) throw new HttpError(404, 'Produit parent introuvable');

      const gallery = parseGallery(parent.gallery);
      const idx = gallery.indexOf(imageUrl);
      if (idx === -1) throw new HttpError(400, "Cette image n'appartient pas à ce produit");
      gallery.splice(idx, 1);

      await supabasePost('products', {
        name: `${parent.name} - Copie`.slice(0, 150),
        description: parent.description || '',
        price: parent.price || '0',
        stock_qty: 0,
        image_url: imageUrl,
        category: parent.category || 'General',
        gallery: []
      });
      await supabasePatch('products', { gallery }, { id: parentId });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'bulk_update_category') {
      const ids = toIdList(input.ids);
      const category = cleanText(input.category, 80);
      if (!category) throw new HttpError(400, 'Catégorie requise');
      for (const id of ids) await supabasePatch('products', { category }, { id });
      return res.status(200).json({ status: 'success', updated: ids.length });
    }

    if (action === 'toggle_visibility') {
      await supabasePatch('products', { is_visible: Boolean(input.is_visible) }, { id: requireInt(input.id, 'id') });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'bulk_toggle_visibility') {
      const ids = toIdList(input.ids);
      const vis = Boolean(input.is_visible);
      for (const id of ids) await supabasePatch('products', { is_visible: vis }, { id });
      return res.status(200).json({ status: 'success' });
    }

    throw new HttpError(400, 'Action inconnue');
  } catch (e) {
    return sendError(res, e);
  }
}
