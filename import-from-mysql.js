import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';

const MYSQL_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'made_in_lo'
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function parseGallery(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: row.price != null ? String(row.price) : '0',
    image_url: row.image_url || 'img/placeholder.png',
    category: row.category || 'General',
    gallery: parseGallery(row.gallery),
    stock_qty: row.stock_qty || 0,
    views: row.views || 0,
    is_visible: row.is_visible !== 0,
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapShop(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address || null,
    lat: row.lat || null,
    lng: row.lng || null,
    login: row.login || null,
    password: row.password || '',
    is_primary: !!row.is_primary,
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    type: row.type || 'delivery',
    product_id: row.product_id || null,
    product_name: row.product_name || null,
    product_price: row.product_price || null,
    size: row.size || null,
    client_name: row.client_name || null,
    client_email: row.client_email || null,
    client_phone: row.client_phone || null,
    client_address: row.client_address || null,
    shop_id: row.shop_id || null,
    shop_name: row.shop_name || null,
    status: row.status || 'pending',
    date: row.date || new Date().toISOString()
  };
}

function mapShopStock(row) {
  return {
    id: row.id,
    shop_id: row.shop_id,
    product_id: row.product_id,
    qty: row.qty || 0,
    last_update: row.last_update || new Date().toISOString()
  };
}

function mapStockShipment(row) {
  return {
    id: row.id,
    shop_id: row.shop_id,
    product_id: row.product_id,
    qty: row.qty || 0,
    status: row.status || 'pending',
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapActivityLog(row) {
  return {
    id: row.id,
    type: row.type || '',
    shop_id: row.shop_id || null,
    shop_name: row.shop_name || null,
    product_id: row.product_id || null,
    product_name: row.product_name || null,
    qty: row.qty || 1,
    message: row.message || null,
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    shop_id: row.shop_id || null,
    shop_name: row.shop_name || null,
    message: row.message || null,
    is_read: !!row.is_read,
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    is_visible: row.is_visible !== 0,
    created_at: row.created_at || new Date().toISOString()
  };
}

async function clearTable(table) {
  const { error } = await supabase.from(table).delete().neq('id', 0);
  if (error) {
    console.warn(`Could not clear ${table}:`, error.message);
  }
}

async function importTable(mapper, table, rows) {
  if (!rows.length) {
    console.log(`No rows to import for ${table}`);
    return;
  }
  const mapped = rows.map(mapper);
  const { data, error } = await supabase.from(table).insert(mapped);
  if (error) {
    console.error(`Failed to import ${table}:`, error.message);
    throw error;
  }
  console.log(`Imported ${mapped.length} rows into ${table}`);
}

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('Connected to MySQL');

    const tables = [
      { name: 'shops', query: 'SELECT * FROM shops' },
      { name: 'categories', query: 'SELECT * FROM categories' },
      { name: 'products', query: 'SELECT * FROM products' },
      { name: 'shop_stock', query: 'SELECT * FROM shop_stock' },
      { name: 'stock_shipments', query: 'SELECT * FROM stock_shipments' },
      { name: 'orders', query: 'SELECT * FROM orders' },
      { name: 'activity_log', query: 'SELECT * FROM activity_log' },
      { name: 'admin_notifications', query: 'SELECT * FROM admin_notifications' }
    ];

    for (const { name, query } of tables) {
      const [rows] = await connection.execute(query);
      console.log(`Fetched ${rows.length} rows from MySQL table ${name}`);

      await clearTable(name);
      await importTable(
        name === 'products' ? mapProduct :
        name === 'shops' ? mapShop :
        name === 'orders' ? mapOrder :
        name === 'shop_stock' ? mapShopStock :
        name === 'stock_shipments' ? mapStockShipment :
        name === 'activity_log' ? mapActivityLog :
        name === 'admin_notifications' ? mapNotification :
        name === 'categories' ? mapCategory :
        (row) => row,
        name,
        rows
      );
    }

    console.log('Import completed successfully');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
