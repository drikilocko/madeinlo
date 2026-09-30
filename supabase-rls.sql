-- RLS Policies for Made in Lo
-- Run this AFTER supabase-schema.sql in Supabase SQL Editor

-- products
alter table products enable row level security;
create policy "products_read" on products for select using (true);
create policy "products_write" on products for insert with check (true);
create policy "products_update" on products for update using (true);
create policy "products_delete" on products for delete using (true);

-- categories
alter table categories enable row level security;
create policy "categories_read" on categories for select using (true);
create policy "categories_write" on categories for insert with check (true);
create policy "categories_update" on categories for update using (true);
create policy "categories_delete" on categories for delete using (true);

-- orders
alter table orders enable row level security;
create policy "orders_read" on orders for select using (true);
create policy "orders_write" on orders for insert with check (true);
create policy "orders_update" on orders for update using (true);

-- shops
alter table shops enable row level security;
create policy "shops_read" on shops for select using (true);
create policy "shops_write" on shops for insert with check (true);
create policy "shops_update" on shops for update using (true);
create policy "shops_delete" on shops for delete using (true);

-- shop_stock
alter table shop_stock enable row level security;
create policy "shop_stock_read" on shop_stock for select using (true);
create policy "shop_stock_write" on shop_stock for insert with check (true);
create policy "shop_stock_update" on shop_stock for update using (true);
create policy "shop_stock_delete" on shop_stock for delete using (true);

-- stock_shipments
alter table stock_shipments enable row level security;
create policy "stock_shipments_read" on stock_shipments for select using (true);
create policy "stock_shipments_write" on stock_shipments for insert with check (true);
create policy "stock_shipments_update" on stock_shipments for update using (true);
create policy "stock_shipments_delete" on stock_shipments for delete using (true);

-- admin_notifications
alter table admin_notifications enable row level security;
create policy "admin_notifications_read" on admin_notifications for select using (true);
create policy "admin_notifications_write" on admin_notifications for insert with check (true);
create policy "admin_notifications_update" on admin_notifications for update using (true);

-- activity_log
alter table activity_log enable row level security;
create policy "activity_log_read" on activity_log for select using (true);
create policy "activity_log_write" on activity_log for insert with check (true);
