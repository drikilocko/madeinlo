import { supabase } from './_supabase.js';
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
        let result = await supabase
          .from('products')
          .select('*')
          .order('category', { ascending: true })
          .order('created_at', { ascending: false });

        let data = result.data;
        if (result.error) {
          const fallback = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
          data = fallback.data;
        }

        return res.status(200).json(data || []);
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
            const { data, error } = await supabase
              .from('products')
              .insert([{
                name: p.name,
                description: p.description,
                price: p.price,
                image_url: imageUrl,
                category: p.category,
                gallery: gallery,
                stock_qty: stock
              }])
              .select('id');

            if (error) throw error;
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

            const { error } = await supabase
              .from('products')
              .update(updateData)
              .eq('id', p.id);

            if (error) throw error;
            return res.status(200).json({ status: 'success' });
          }
        } else if (action === 'delete') {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', input.id);

          if (error) throw error;
          return res.status(200).json({ status: 'success' });
        } else if (action === 'increment_view') {
          const { data } = await supabase
            .from('products')
            .select('views')
            .eq('id', input.id)
            .single();

          const { error } = await supabase
            .from('products')
            .update({ views: (data?.views || 0) + 1 })
            .eq('id', input.id);

          if (error) throw error;
          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_add') {
          const count = input.count ? parseInt(input.count) : 100;

          const { data: urls } = await supabase
            .from('products')
            .select('image_url');

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

          const { error } = await supabase
            .from('products')
            .insert(products);

          if (error) throw error;
          return res.status(200).json({ status: 'success', added: count });
        } else if (action === 'merge') {
          const sourceId = input.source_id;
          const targetId = input.target_id;

          const { data: source, error: sourceError } = await supabase
            .from('products')
            .select('image_url, gallery')
            .eq('id', sourceId)
            .single();

          if (sourceError || !source) throw new Error('Source product not found');

          const { data: target, error: targetError } = await supabase
            .from('products')
            .select('gallery')
            .eq('id', targetId)
            .single();

          if (targetError || !target) throw new Error('Target product not found');

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

          const { error: updateError } = await supabase
            .from('products')
            .update({ gallery: targetGallery })
            .eq('id', targetId);

          if (updateError) throw updateError;

          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', sourceId);

          if (deleteError) throw deleteError;

          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_merge') {
          const sourceIds = input.source_ids;
          const targetId = input.target_id;

          if (!sourceIds || sourceIds.length === 0) throw new Error('No source IDs provided');

          const { data: target, error: targetError } = await supabase
            .from('products')
            .select('gallery')
            .eq('id', targetId)
            .single();

          if (targetError || !target) throw new Error('Target product not found');

          const targetGallery = parseGallery(target.gallery);

          for (const sourceId of sourceIds) {
            const { data: source } = await supabase
              .from('products')
              .select('image_url, gallery')
              .eq('id', sourceId)
              .single();

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

          const { error: updateError } = await supabase
            .from('products')
            .update({ gallery: targetGallery })
            .eq('id', targetId);

          if (updateError) throw updateError;

          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .in('id', sourceIds);

          if (deleteError) throw deleteError;

          return res.status(200).json({ status: 'success' });
        } else if (action === 'unmerge') {
          const parentId = input.parent_id;
          const imageUrl = input.image_url;

          const { data: parent, error: parentError } = await supabase
            .from('products')
            .select('*')
            .eq('id', parentId)
            .single();

          if (parentError || !parent) throw new Error('Parent product not found');

          let gallery = parseGallery(parent.gallery);
          const idx = gallery.indexOf(imageUrl);
          if (idx !== -1) {
            gallery.splice(idx, 1);
          }

          const newName = `${parent.name} - Copie`;
          const { error: insertError } = await supabase
            .from('products')
            .insert([{
              name: newName,
              description: parent.description || '',
              price: parent.price || 0,
              stock_qty: 0,
              image_url: imageUrl,
              category: parent.category || 'General',
              gallery: []
            }]);

          if (insertError) throw insertError;

          const { error: updateError } = await supabase
            .from('products')
            .update({ gallery })
            .eq('id', parentId);

          if (updateError) throw updateError;

          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_update_category') {
          const ids = input.ids;
          const category = input.category;

          if (!ids || ids.length === 0) throw new Error('No product IDs provided');

          const { error } = await supabase
            .from('products')
            .update({ category })
            .in('id', ids);

          if (error) throw error;
          return res.status(200).json({ status: 'success', updated: ids.length });
        } else if (action === 'toggle_visibility') {
          const { error } = await supabase
            .from('products')
            .update({ is_visible: Boolean(input.is_visible) })
            .eq('id', input.id);

          if (error) throw error;
          return res.status(200).json({ status: 'success' });
        } else if (action === 'bulk_toggle_visibility') {
          const ids = input.ids;
          const vis = Boolean(input.is_visible);

          if (!ids || ids.length === 0) throw new Error('No IDs provided');

          const { error } = await supabase
            .from('products')
            .update({ is_visible: vis })
            .in('id', ids);

          if (error) throw error;
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
