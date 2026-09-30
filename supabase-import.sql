-- Made in Lo - Data import from MySQL dump
-- Run this AFTER supabase-rls.sql in Supabase SQL Editor
-- This disables RLS, inserts data, then re-enables RLS

SET row_security = off;

INSERT INTO shops (id, name, address, lat, lng, login, password, is_primary, created_at) VALUES
(1, 'dream', 'lome', '6.150200', '1.241306', 'admin2', '$2y$10$HVmq7q.vR.QjHDILJlDDT.lpdMRZ2uAB16IcNCD37nShTzqNdS/PW', true, '2026-05-14 02:45:42'),
(3, 'dream4', 'lome', '6.183726', '1.192060', 'jj', '$2y$10$6y386za7cAiMPE89PVjL5.hIgZwFZAfZPjyYyCW33FyOS1mfB9G9W', false, '2026-05-17 00:46:49');

INSERT INTO categories (id, name, is_visible, created_at) VALUES
(1, 'ensemble', true, '2026-05-16 01:19:08'),
(2, 'haut', true, '2026-05-16 01:19:08'),
(3, 'Accessoires', true, '2026-05-16 01:19:08'),
(4, 'Chaussures', true, '2026-05-16 01:19:08');

INSERT INTO products (id, name, description, price, stock_qty, image_url, category, gallery, is_visible, views, created_at) VALUES
(2, 'Produit 2', 'Description du produit 2', '10000.00', 6, 'produit/2.webp', 'ensemble', '[]', true, 6, '2026-05-16 00:32:46'),
(3, 'Produit 3', 'Description du produit 3', '0.00', 0, 'produit/3.webp', 'ensemble', null, true, 0, '2026-05-16 00:32:46'),
(4, 'Produit 4', 'Description du produit 4', '0.00', 0, 'produit/4.webp', 'ensemble', null, true, 0, '2026-05-16 00:32:46'),
(6, 'Produit 6', 'Description du produit 6', '0.00', 0, 'produit/6.webp', 'ensemble', '["produit\/5.webp"]', true, 1, '2026-05-16 00:32:46'),
(9, 'Produit 9', 'Description du produit 9', '10000.00', 3, 'produit/9.webp', 'Accessoires', '["produit\/7.webp","produit\/8.webp"]', true, 34, '2026-05-16 00:32:46'),
(10, 'Produit 10', 'Description du produit 10', '0.00', 0, 'produit/10.webp', 'haut', '["produit\/11.webp","produit\/12.webp"]', true, 0, '2026-05-16 00:32:46'),
(13, 'Produit 13', 'Description du produit 13', '0.00', 0, 'produit/13.webp', 'Nouveautés', '["produit\/16.webp","produit\/14.webp","produit\/15.webp","produit\/17.webp","produit\/20.webp","produit\/19.webp","produit\/21.webp","produit\/18.webp"]', true, 0, '2026-05-16 00:32:46'),
(22, 'Produit 22', 'Description du produit 22', '0.00', 0, 'produit/22.webp', 'Nouveautés', null, true, 0, '2026-05-16 00:32:46'),
(23, 'Produit 23', 'Description du produit 23', '0.00', 0, 'produit/23.webp', 'Nouveautés', null, true, 0, '2026-05-16 00:32:46'),
(24, 'Produit 24', 'Description du produit 24', '0.00', 0, 'produit/24.webp', 'haut', '["produit\/25.webp","produit\/27.webp","produit\/26.webp"]', true, 0, '2026-05-16 00:32:46'),
(28, 'Produit 28', 'Description du produit 28', '0.00', 0, 'produit/28.webp', 'haut', '["produit\/29.webp","produit\/30.webp"]', true, 0, '2026-05-16 00:32:46'),
(31, 'Produit 31', 'Description du produit 31', '0.00', 0, 'produit/31.webp', 'haut', '["produit\/32.webp","produit\/34.webp","produit\/33.webp"]', true, 0, '2026-05-16 00:32:46'),
(35, 'Produit 35', 'Description du produit 35', '0.00', 0, 'produit/35.webp', 'haut', '["produit\/39.webp","produit\/38.webp","produit\/36.webp","produit\/37.webp"]', true, 0, '2026-05-16 00:32:46'),
(40, 'Produit 40', 'Description du produit 40', '0.00', 0, 'produit/40.webp', 'haut', '["produit\/41.webp","produit\/44.webp","produit\/43.webp","produit\/42.webp"]', true, 0, '2026-05-16 00:32:46'),
(45, 'Produit 45', 'Description du produit 45', '0.00', 0, 'produit/45.webp', 'haut', null, true, 0, '2026-05-16 00:32:46'),
(47, 'Produit 47', 'Description du produit 47', '0.00', 0, 'produit/47.webp', 'haut', '["produit\/48.webp","produit\/49.webp","produit\/46.webp"]', true, 0, '2026-05-16 00:32:46'),
(50, 'Produit 50', 'Description du produit 50', '0.00', 0, 'produit/50.webp', 'Nouveautés', '["produit\/51.webp"]', true, 0, '2026-05-16 00:32:46'),
(52, 'Produit 52', 'Description du produit 52', '0.00', 0, 'produit/52.webp', 'haut', '["produit\/53.webp"]', true, 0, '2026-05-16 00:32:46'),
(54, 'Produit 54', 'Description du produit 54', '0.00', 0, 'produit/54.webp', 'Nouveautés', '["produit\/55.webp","produit\/57.webp","produit\/56.webp"]', true, 0, '2026-05-16 00:32:46'),
(59, 'Produit 59', 'Description du produit 59', '0.00', 0, 'produit/59.webp', 'ensemble', '["produit\/60.webp","produit\/61.webp","produit\/62.webp","produit\/65.webp","produit\/64.webp","produit\/63.webp","produit\/66.webp","produit\/67.webp"]', true, 2, '2026-05-16 00:32:46'),
(68, 'Produit 68', 'Description du produit 68', '0.00', 0, 'produit/68.webp', 'haut', '["produit\/71.webp","produit\/72.webp","produit\/69.webp","produit\/70.webp"]', true, 0, '2026-05-16 00:32:46'),
(73, 'Produit 73', 'Description du produit 73', '0.00', 0, 'produit/73.webp', 'ensemble', null, true, 0, '2026-05-16 00:32:46'),
(75, 'Produit 75', 'Description du produit 75', '0.00', 0, 'produit/75.webp', 'Accessoires', '["produit\/74.webp","produit\/76.webp","produit\/79.webp"]', true, 0, '2026-05-16 00:32:46'),
(77, 'Produit 77', 'Description du produit 77', '0.00', 0, 'produit/77.webp', 'haut', null, true, 0, '2026-05-16 00:32:46'),
(78, 'Produit 78', 'Description du produit 78', '0.00', 0, 'produit/78.webp', 'Nouveautés', '["produit\/83.webp","produit\/82.webp","produit\/84.webp"]', true, 0, '2026-05-16 00:32:46'),
(80, 'Produit 80', 'Description du produit 80', '0.00', 0, 'produit/80.webp', 'Nouveautés', null, true, 0, '2026-05-16 00:32:46'),
(81, 'Produit 81', 'Description du produit 81', '0.00', 0, 'produit/81.webp', 'Nouveautés', null, true, 0, '2026-05-16 00:32:46'),
(86, 'Produit 86', 'Description du produit 86', '0.00', 0, 'produit/86.webp', 'haut', '["produit\/85.webp","produit\/87.webp","produit\/88.webp","produit\/89.webp"]', true, 0, '2026-05-16 00:32:46'),
(90, 'Produit 90', 'Description du produit 90', '0.00', 0, 'produit/90.webp', 'haut', '["produit\/91.webp","produit\/92.webp"]', true, 0, '2026-05-16 00:32:46'),
(94, 'Produit 94', 'Description du produit 94', '0.00', 0, 'produit/94.webp', 'haut', null, true, 0, '2026-05-16 00:32:46'),
(101, 'Produit 59 - Copie', 'Description du produit 59', '0.00', 0, 'produit/58.webp', 'ensemble', '[]', true, 0, '2026-06-06 16:13:52'),
(102, 'Produit 59', '', '0.00', 996, 'img/products/1780789168_6a24afb03ee5e.jpg', 'Accessoires', '[]', true, 0, '2026-06-06 23:39:28');

INSERT INTO shop_stock (id, shop_id, product_id, qty, last_update) VALUES
(1, 1, 9, 36, '2026-06-06 16:07:25'),
(2, 1, 2, 0, '2026-05-17 00:41:31');

INSERT INTO stock_shipments (id, shop_id, product_id, qty, status, created_at) VALUES
(1, 1, 2, 4, 'accepted', '2026-05-17 00:24:53'),
(2, 1, 9, 2, 'accepted', '2026-05-17 00:24:53'),
(3, 1, 3, 5, 'accepted', '2026-05-17 00:24:53'),
(4, 1, 9, 2, 'accepted', '2026-05-17 00:25:13'),
(5, 1, 2, 1, 'accepted', '2026-05-17 00:25:13'),
(6, 1, 2, 44, 'accepted', '2026-05-17 00:25:32'),
(7, 1, 9, 440, 'accepted', '2026-05-17 00:25:32'),
(8, 1, 9, 3, 'accepted', '2026-05-17 00:35:47'),
(9, 1, 9, 4, 'pending', '2026-05-17 01:01:07');

INSERT INTO orders (id, type, product_id, product_name, product_price, size, client_name, client_email, client_phone, client_address, shop_id, shop_name, status, date) VALUES
(1, 'delivery', 3, 'Produit 3', '0.00', 'M', 'p*tain de merde', NULL, '90290081', 'lome', NULL, NULL, 'pending', '2026-05-16 04:16:33'),
(2, 'delivery', 59, 'Produit 59', '0.00', 'M', 'p*tain de merde', NULL, '90290081', 'lome', NULL, NULL, 'pending', '2026-05-16 04:21:13'),
(3, 'delivery', 3, 'Produit 3', '0.00', 'M', 'sam', NULL, 'sam', 'lome, Lomé', NULL, NULL, 'pending', '2026-05-16 04:29:04'),
(4, 'delivery', 59, 'Produit 59 (M) + Produit 23 (M) + Produit 28 (M) + Produit 51 (M)', '0', 'Multi', 'sam', NULL, 'sam', 'lome, Lomé', NULL, NULL, 'delivered', '2026-05-16 04:42:01'),
(5, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'Client PayPal', NULL, 'N/A', 'PAYPAL [3HX76478S72968801] | N/A', NULL, NULL, 'delivered', '2026-06-06 13:05:46'),
(6, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'Client PayPal', NULL, 'N/A', 'PAYPAL [95D16108PM285180N] | N/A', NULL, NULL, 'delivered', '2026-06-06 13:16:40'),
(7, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', '', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:03:28'),
(8, 'delivery', 9, 'Produit 9', '20000 FCFA', 'M', 'dream sam', '', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:04:21'),
(9, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', '', '+22890290081', 'MOMO [90290081] | 3333', NULL, NULL, 'pending', '2026-06-06 14:14:03'),
(10, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', '', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:16:26'),
(11, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', '', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:18:37'),
(12, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', '', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:22:42'),
(13, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:42'),
(14, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:44'),
(15, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:45'),
(16, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:46'),
(17, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:46'),
(18, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:50'),
(19, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:54'),
(20, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:55'),
(21, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:35:55'),
(22, 'delivery', 2, 'Produit 2', '20000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:45:08'),
(23, 'delivery', 2, 'Produit 2', '20000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 14:45:10'),
(24, 'delivery', 2, 'Produit 2', '10000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 15:28:24'),
(25, 'delivery', 9, 'Produit 9', '20000 FCFA', 'M', 'dream sam', 'samdreamyy@gmail.com', '+22890290081', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 15:56:22'),
(26, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'koko', 'creations.made.in.lo@gmail.com', '9000000', 'MOMO [90290081] | 234222', NULL, NULL, 'pending', '2026-06-06 16:00:06'),
(27, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'koko', 'creations.made.in.lo@gmail.com', '9000000', 'MOMO [9000000] | 234222', NULL, NULL, 'pending', '2026-06-06 16:02:37'),
(28, 'delivery', 9, 'Produit 9', '10000 FCFA', 'M', 'koko', 'creations.made.in.lo@gmail.com', '9000000', 'PAYPAL [0V038717068330142] | 234222', NULL, NULL, 'paid', '2026-06-06 16:05:13');

INSERT INTO activity_log (id, type, shop_id, shop_name, product_id, product_name, qty, message, created_at) VALUES
(1, 'sale_online', NULL, NULL, 3, 'Produit 3', 1, 'Nouvelle commande en ligne : ''Produit 3'' commandé par p*tain de merde.', '2026-05-16 04:16:33'),
(2, 'sale_online', NULL, NULL, 59, 'Produit 59', 1, 'Nouvelle commande en ligne : ''Produit 59'' commandé par p*tain de merde.', '2026-05-16 04:21:13'),
(3, 'sale_online', NULL, NULL, 3, 'Produit 3', 1, 'Nouvelle commande en ligne : ''Produit 3'' commandé par sam.', '2026-05-16 04:29:04'),
(4, 'sale_online', NULL, NULL, 59, 'Produit 59 (M) + Produit 23 (M) + Produit 28 (M) + Produit 51 (M)', 1, 'Nouvelle commande en ligne : ''Produit 59 (M) + Produit 23 (M) + Produit 28 (M) + Produit 51 (M)'' commandé par sam.', '2026-05-16 04:42:01'),
(5, 'assignment', 1, 'dream', 2, 'Produit 2', 4, 'Envoi de stock en attente : 4 unité(s) de ''Produit 2'' expédiée(s) à ''dream''.', '2026-05-17 00:24:53'),
(6, 'assignment', 1, 'dream', 9, 'Produit 9', 2, 'Envoi de stock en attente : 2 unité(s) de ''Produit 9'' expédiée(s) à ''dream''.', '2026-05-17 00:24:53'),
(7, 'assignment', 1, 'dream', 3, 'Produit 3', 5, 'Envoi de stock en attente : 5 unité(s) de ''Produit 3'' expédiée(s) à ''dream''.', '2026-05-17 00:24:53'),
(8, 'assignment', 1, 'dream', 9, 'Produit 9', 2, 'Envoi de stock en attente : 2 unité(s) de ''Produit 9'' expédiée(s) à ''dream''.', '2026-05-17 00:25:13'),
(9, 'assignment', 1, 'dream', 2, 'Produit 2', 1, 'Envoi de stock en attente : 1 unité(s) de ''Produit 2'' expédiée(s) à ''dream''.', '2026-05-17 00:25:13'),
(10, 'assignment', 1, 'dream', 2, 'Produit 2', 44, 'Envoi de stock en attente : 44 unité(s) de ''Produit 2'' expédiée(s) à ''dream''.', '2026-05-17 00:25:32'),
(11, 'assignment', 1, 'dream', 9, 'Produit 9', 440, 'Envoi de stock en attente : 440 unité(s) de ''Produit 9'' expédiée(s) à ''dream''.', '2026-05-17 00:25:32'),
(12, 'assignment', 1, 'dream', 9, 'Produit 9', 3, 'Envoi de stock en attente : 3 unité(s) de ''Produit 9'' expédiée(s) à ''dream''.', '2026-05-17 00:35:47'),
(13, 'assignment', 1, NULL, 9, NULL, 1, 'Réception confirmée : Le shop a accepté 2 unités.', '2026-05-17 00:36:05'),
(14, 'assignment', 1, NULL, 2, NULL, 1, 'Réception confirmée : Le shop a accepté 4 unités.', '2026-05-17 00:36:10'),
(15, 'assignment', 1, NULL, 9, NULL, 1, 'Réception confirmée : Le shop a accepté 2 unités.', '2026-05-17 00:36:12'),
(16, 'assignment', 1, NULL, 9, NULL, 1, 'Réception confirmée : Le shop a accepté toutes les expéditions en attente pour ce produit (Total: 443 unités).', '2026-05-17 00:41:53'),
(17, 'sale_partner', 1, 'dream', 9, 'Produit 9', 2, 'Vente enregistrée : 2 unité(s) de ''Produit 9'' vendue(s) par le shop ''dream''.', '2026-05-17 00:42:18'),
(18, 'sale_partner', 1, 'dream', 9, 'Produit 9', 19, 'Vente enregistrée : 19 unité(s) de ''Produit 9'' vendue(s) par le shop ''dream''.', '2026-05-17 00:42:24'),
(19, '', 1, NULL, 9, NULL, 1, 'Stock rectifié manuellement pour le produit ID 9 (fixé à 42).', '2026-05-17 01:00:34'),
(20, 'assignment', 1, 'dream', 9, 'Produit 9', 4, 'Envoi de stock en attente : 4 unité(s) de ''Produit 9'' expédiée(s) à ''dream''.', '2026-05-17 01:01:07'),
(21, '', 1, NULL, 9, NULL, 1, 'Stock rectifié : Le stock du produit ID 9 a été fixé à 40 (différence de -2, stock central ajusté de --2).', '2026-05-17 01:07:16'),
(22, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par Client PayPal.', '2026-06-06 13:05:46'),
(23, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par Client PayPal.', '2026-06-06 13:16:40'),
(24, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:03:28'),
(25, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:04:21'),
(26, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:14:03'),
(27, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:16:26'),
(28, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:18:37'),
(29, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:22:42'),
(30, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:35:54'),
(31, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:35:55'),
(32, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:35:55'),
(33, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:35:55'),
(34, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:35:57'),
(35, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:36:01'),
(36, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:36:01'),
(37, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 14:36:02'),
(38, 'sale_online', NULL, NULL, 2, 'Produit 2', 1, 'Nouvelle commande en ligne : ''Produit 2'' commandé par dream sam.', '2026-06-06 14:45:15'),
(39, 'sale_online', NULL, NULL, 2, 'Produit 2', 1, 'Nouvelle commande en ligne : ''Produit 2'' commandé par dream sam.', '2026-06-06 14:45:15'),
(40, 'sale_online', NULL, NULL, 2, 'Produit 2', 1, 'Nouvelle commande en ligne : ''Produit 2'' commandé par dream sam.', '2026-06-06 15:28:31'),
(41, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par dream sam.', '2026-06-06 15:56:23'),
(42, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par koko.', '2026-06-06 16:00:08'),
(43, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par koko.', '2026-06-06 16:02:41'),
(44, 'sale_online', NULL, NULL, 9, 'Produit 9', 1, 'Nouvelle commande en ligne : ''Produit 9'' commandé par koko.', '2026-06-06 16:05:18'),
(45, 'sale_partner', 1, 'dream', 9, 'Produit 9', 4, 'Vente enregistrée : 4 unité(s) de ''Produit 9'' vendue(s) par le shop ''dream''.', '2026-06-06 16:07:25');

INSERT INTO admin_notifications (id, shop_id, shop_name, message, is_read, created_at) VALUES
(1, 1, 'dream', 'Vente enregistrée : 2 unité(s) de ''Produit 9'' vendue(s) par le shop ''dream''.', false, '2026-05-17 00:42:18'),
(2, 1, 'dream', 'Vente enregistrée : 19 unité(s) de ''Produit 9'' vendue(s) par le shop ''dream''.', false, '2026-05-17 00:42:24'),
(3, 1, 'dream', 'Vente enregistrée : 4 unité(s) de ''Produit 9'' vendue(s) par le shop ''dream''.', false, '2026-06-06 16:07:25');

SET row_security = on;
