import { supabaseGet, supabasePost, supabasePatch, supabaseDelete } from './_supabase.js';
import { parseGallery, getQueryParam } from './_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        // Check if this is an admin request (admin=1 query param)
        const isAdmin = getQueryParam(req, 'admin') === '1';
        let data = [];
        try {
          const query = { order: 'category.asc,created_at.desc' };
          if (!isAdmin) query.filter = { is_visible: 'eq.true' };
          data = await supabaseGet('products', query);
        } catch (e) {
          const fallbackQuery = {};
          if (!isAdmin) fallbackQuery.filter = { is_visible: 'eq.true' };
          data = await supabaseGet('products', fallbackQuery);
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          const fallbackProducts = [];
          for (let i = 1; i <= 30; i++) {
            fallbackProducts.push({
              id: i,
              name: `Pièce Made in Lo #${i}`,
              description: `Modèle d'exception Made in Lo (Édition #${i})`,
              price: String(15000 + (i % 5) * 5000),
              image_url: `produit/${i}.webp`,
              category: i % 3 === 0 ? 'Ensembles' : (i % 2 === 0 ? 'Bas' : 'Hauts'),
              gallery: [],
              stock_qty: 10,
              views: 0,
              is_visible: true
            });
          }
          return res.status(200).json(fallbackProducts);
        }

        return res.status(200).json(data);
      }

      case 'POST': {
        const contentType = req.headers['content-type'] || '';
        let input = req.body || {};

        if (!input.action) {
          return res.status(200).json({});
        }

        const { action } = input;

        if (action === 'add' || action === 'edit') {
          const isEdit = action === 'edit';
          const p = input.product || input;
          const gallery = parseGallery(p.gallery);
          const stock = p.stock_qty ? parseInt(p.stock_qty) : 0;
          let imageUrl = p.image_url || '';

          if (!isEdit) {
            const data = await supabasePost('products', {
              name: p.name,
              description: p.description,
              price: p.price,
              image_url: imageUrl,
              category: p.category,
              gallery: gallery,
              stock_qty: stock
            });
            return res.status(200).json({ status: 'success', id: data[0].id });
          } else {
            const updateData = {
              name: p.name,
              description: p.description,
              price: p.price,
              image_url: imageUrl,
              category: p.category,
              gallery: gallery,
              stock_qty: stock
            };

            await supabasePatch('products', updateData, { id: p.id });
            return res.status(200).json({ status: 'success' });
          }
        } else if (action === 'delete') {
          await supabaseDelete('products', { id: input.id });
          return res.status(200).json({ status: 'success' });
        } else if (action === 'increment_view') {
          const products = await supabaseGet('products', {});
          const product = products.find(pr => pr.id === input.id);
          const currentViews = product ? (product.views || 0) : 0;
          await supabasePatch('products', { views: currentViews + 1 }, { id: input.id });
          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_add') {
          const count = input.count ? parseInt(input.count) : 100;

          const urls = await supabaseGet('products', {});
          let maxNum = 0;
          for (const row of urls || []) {
            const match = row.image_url?.match(/(\d+)\.(webp|png|jpg)$/i);
            if (match) {
              maxNum = Math.max(maxNum, parseInt(match[1]));
            }
          }

          const products = [];
          for (let i = 1; i <= count; i++) {
            const currentNum = maxNum + i;
            products.push({
              name: `nom${currentNum}`,
              description: '',
              price: '0',
              image_url: `produit/${currentNum}.webp`,
              category: 'Hauts'
            });
          }

          await supabasePost('products', products);
          return res.status(200).json({ status: 'success', added: count });
        } else if (action === 'merge') {
          const sourceId = input.source_id;
          const targetId = input.target_id;

          const allProducts = await supabaseGet('products', {});
          const source = allProducts.find(pr => pr.id === sourceId);
          const target = allProducts.find(pr => pr.id === targetId);

          if (!source) throw new Error('Source product not found');
          if (!target) throw new Error('Target product not found');

          const targetGallery = parseGallery(target.gallery);
          const sourceGallery = parseGallery(source.gallery);

          if (source.image_url && !targetGallery.includes(source.image_url)) {
            targetGallery.push(source.image_url);
          }

          for (const img of sourceGallery) {
            if (!targetGallery.includes(img)) {
              targetGallery.push(img);
            }
          }

          await supabasePatch('products', { gallery: targetGallery }, { id: targetId });
          await supabaseDelete('products', { id: sourceId });

          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_merge') {
          const sourceIds = input.source_ids;
          const targetId = input.target_id;

          if (!sourceIds || sourceIds.length === 0) throw new Error('No source IDs provided');

          const allProducts = await supabaseGet('products', {});
          const target = allProducts.find(pr => pr.id === targetId);

          if (!target) throw new Error('Target product not found');

          const targetGallery = parseGallery(target.gallery);

          for (const sourceId of sourceIds) {
            const source = allProducts.find(pr => pr.id === sourceId);
            if (source) {
              if (source.image_url && !targetGallery.includes(source.image_url)) {
                targetGallery.push(source.image_url);
              }
              const sourceGal = parseGallery(source.gallery);
              for (const img of sourceGal) {
                if (!targetGallery.includes(img)) {
                  targetGallery.push(img);
                }
              }
            }
          }

          await supabasePatch('products', { gallery: targetGallery }, { id: targetId });

          for (const sourceId of sourceIds) {
            await supabaseDelete('products', { id: sourceId });
          }

          return res.status(200).json({ status: 'success' });
        } else if (action === 'unmerge') {
          const parentId = input.parent_id;
          const imageUrl = input.image_url;

          const allProducts = await supabaseGet('products', {});
          const parent = allProducts.find(pr => pr.id === parentId);

          if (!parent) throw new Error('Parent product not found');

          let gallery = parseGallery(parent.gallery);
          const idx = gallery.indexOf(imageUrl);
          if (idx !== -1) {
            gallery.splice(idx, 1);
          }

          const newName = `${parent.name} - Copie`;
          await supabasePost('products', {
            name: newName,
            description: parent.description || '',
            price: parent.price || 0,
            stock_qty: 0,
            image_url: imageUrl,
            category: parent.category || 'General',
            gallery: []
          });

          await supabasePatch('products', { gallery }, { id: parentId });

          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_update_category') {
          const ids = input.ids;
          const category = input.category;

          if (!ids || ids.length === 0) throw new Error('No product IDs provided');

          for (const id of ids) {
            await supabasePatch('products', { category }, { id });
          }

          return res.status(200).json({ status: 'success', updated: ids.length });
        } else if (action === 'toggle_visibility') {
          await supabasePatch('products', { is_visible: Boolean(input.is_visible) }, { id: input.id });
          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_toggle_visibility') {
          const ids = input.ids;
          const vis = Boolean(input.is_visible);

          if (!ids || ids.length === 0) throw new Error('No IDs provided');

          for (const id of ids) {
            await supabasePatch('products', { is_visible: vis }, { id });
          }

          return res.status(200).json({ status: 'success' });
        }

        return res.status(200).json({});
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
