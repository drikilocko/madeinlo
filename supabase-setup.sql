-- =====================================================================
--  MADE IN LO — INSTALLATION COMPLÈTE SUPABASE (un seul script)
-- =====================================================================
--  Où : Supabase > SQL Editor > New query > coller tout > Run
--  Contenu : tables + paiements PayDunya + sécurité (RLS) + stockage des images.
--  Sans risque : peut être relancé autant de fois que nécessaire,
--  il ne supprime AUCUNE donnée existante.
--
--  Principe de sécurité :
--   - La clé publique (anon) ne peut RIEN lire ni écrire directement.
--   - Le site passe par l'API Vercel (/api/*) qui utilise la clé service_role
--     (secrète, uniquement dans Vercel) et vérifie qui est connecté.
--   - Les images produits sont dans le bucket public "products" :
--     lecture publique, envoi uniquement via l'admin.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) TABLES
-- ---------------------------------------------------------------------

create table if not exists public.categories (
    id          serial primary key,
    name        text unique not null,
    is_visible  boolean not null default true,
    created_at  timestamptz not null default now()
);

create table if not exists public.products (
    id          serial primary key,
    name        text not null,
    description text,
    price       text not null default '0',           -- prix en FCFA (ex: "15000")
    image_url   text not null default '',            -- URL Supabase Storage ou chemin du site (produit/1.webp)
    category    text not null default 'General',
    gallery     jsonb not null default '[]'::jsonb,  -- images secondaires
    stock_qty   integer not null default 0,
    views       integer not null default 0,
    is_visible  boolean not null default true,
    created_at  timestamptz not null default now()
);

create table if not exists public.shops (
    id          serial primary key,
    name        text not null,
    address     text,
    lat         text,
    lng         text,
    login       text unique not null,
    password    text not null,                       -- hash bcrypt (jamais en clair)
    is_primary  boolean not null default false,
    created_at  timestamptz not null default now()
);

create table if not exists public.orders (
    id             serial primary key,
    type           text,                             -- delivery | pickup
    product_id     integer,
    product_name   text,
    product_price  text,
    size           text,
    client_name    text,
    client_email   text,
    client_phone   text,
    client_address text,
    shop_id        integer,
    shop_name      text,
    status         text not null default 'pending',  -- awaiting_payment | paid | completed | delivered | cancelled
    -- Paiement PayDunya
    payment_method text,                             -- card | tmoney-tg | moov-tg | ...
    payment_token  text,                             -- jeton de facture PayDunya
    payment_status text,                             -- unpaid | paid | cancelled | failed | mismatch (NULL = ancienne commande)
    amount         integer,                          -- montant facturé (FCFA), calculé par le serveur
    items          jsonb,                            -- [{product_id, name, qty, unit_price}]
    paid_at        timestamptz,
    date           timestamptz not null default now()
);

create table if not exists public.shop_stock (
    id          serial primary key,
    shop_id     integer references public.shops(id) on delete cascade,
    product_id  integer references public.products(id) on delete cascade,
    qty         integer not null default 0,
    last_update timestamptz not null default now()
);

create table if not exists public.stock_shipments (
    id          serial primary key,
    shop_id     integer references public.shops(id) on delete cascade,
    product_id  integer references public.products(id) on delete cascade,
    qty         integer not null,
    status      text not null default 'pending',     -- pending | accepted
    created_at  timestamptz not null default now()
);

create table if not exists public.admin_notifications (
    id          serial primary key,
    shop_id     integer references public.shops(id) on delete cascade,  -- vide pour les paiements en ligne
    shop_name   text,
    message     text not null,
    is_read     boolean not null default false,
    created_at  timestamptz not null default now()
);

create table if not exists public.activity_log (
    id           serial primary key,
    type         text not null,                      -- sale_online | sale_partner | assignment | rectification
    shop_id      integer references public.shops(id) on delete set null,
    shop_name    text,
    product_id   integer references public.products(id) on delete set null,
    product_name text,
    qty          integer not null default 1,
    message      text,
    created_at   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2) MISE À NIVEAU D'UNE BASE EXISTANTE (colonnes ajoutées depuis)
-- ---------------------------------------------------------------------

alter table public.products add column if not exists gallery    jsonb   not null default '[]'::jsonb;
alter table public.products add column if not exists stock_qty  integer not null default 0;
alter table public.products add column if not exists views      integer not null default 0;
alter table public.products add column if not exists is_visible boolean not null default true;
alter table public.categories add column if not exists is_visible boolean not null default true;

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_token  text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists amount         integer;
alter table public.orders add column if not exists items          jsonb;
alter table public.orders add column if not exists paid_at        timestamptz;

alter table public.admin_notifications alter column shop_id drop not null;


-- ---------------------------------------------------------------------
-- 3) INDEX
-- ---------------------------------------------------------------------

create index if not exists idx_products_category       on public.products(category);
create index if not exists idx_products_created_at     on public.products(created_at);
create index if not exists idx_products_visible        on public.products(is_visible);
create index if not exists idx_activity_log_shop_id    on public.activity_log(shop_id);
create index if not exists idx_activity_log_created_at on public.activity_log(created_at desc);
create index if not exists idx_shop_stock_shop         on public.shop_stock(shop_id, product_id);
create index if not exists idx_shipments_shop_status   on public.stock_shipments(shop_id, status);
create index if not exists idx_orders_payment_status   on public.orders(payment_status);
create unique index if not exists idx_orders_payment_token
    on public.orders(payment_token) where payment_token is not null;


-- ---------------------------------------------------------------------
-- 4) SÉCURITÉ : RLS activé partout, AUCUNE règle publique
--    => la clé anon ne peut rien faire ; seule l'API (service_role) accède.
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('products','categories','orders','shops','shop_stock',
                        'stock_shipments','admin_notifications','activity_log')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.products            enable row level security;
alter table public.categories          enable row level security;
alter table public.orders              enable row level security;
alter table public.shops               enable row level security;
alter table public.shop_stock          enable row level security;
alter table public.stock_shipments     enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.activity_log        enable row level security;

revoke all on public.products, public.categories, public.orders, public.shops,
              public.shop_stock, public.stock_shipments, public.admin_notifications,
              public.activity_log
  from anon, authenticated;


-- ---------------------------------------------------------------------
-- 5) STOCKAGE DES IMAGES PRODUITS (Supabase Storage)
--    Bucket public "products" : tout le monde peut VOIR les images,
--    seule l'API (admin connecté) peut en AJOUTER. 3 Mo max, images uniquement.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 3145728,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual ilike '%products%' or with_check ilike '%products%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 6) DONNÉES DE DÉPART (seulement si elles n'existent pas)
-- ---------------------------------------------------------------------

insert into public.categories (name) values
  ('Hauts'), ('Bas'), ('Ensembles'), ('Accessoires'), ('General')
on conflict (name) do nothing;


-- ---------------------------------------------------------------------
-- 7) COMPTEURS D'ID : à jour avec les données (évite les erreurs
--    "duplicate key" après un import avec des id fixes)
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['products','categories','orders','shops','shop_stock',
                           'stock_shipments','admin_notifications','activity_log']
  loop
    execute format(
      'select setval(pg_get_serial_sequence(''public.%1$I'', ''id''), coalesce((select max(id) from public.%1$I), 0) + 1, false)', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 8) (OPTIONNEL) DONNER LE RÔLE ADMIN À UN COMPTE
--    1. Supabase > Authentication > Users > Add user (email + mot de passe, "Auto confirm")
--    2. Remplacer l'email ci-dessous, décommenter et exécuter.
--    (Alternative : variable ADMIN_EMAILS dans Vercel. Une seule des deux suffit.)
-- ---------------------------------------------------------------------

-- update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--  where email = 'ton-email@exemple.com';


-- ---------------------------------------------------------------------
-- 9) VÉRIFICATION : doit afficher 8 tables avec rls = true et 0 règle
-- ---------------------------------------------------------------------

select c.relname as table_name,
       c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('products','categories','orders','shops','shop_stock',
                    'stock_shipments','admin_notifications','activity_log')
order by c.relname;
