-- 1. Store Settings Table (Replaces the base app_state)
create table public.store_settings (
  id text primary key default 'main-store',
  theme_preference boolean default false,
  currency text default '₹',
  tax_rate numeric default 0,
  default_min_stock integer default 5,
  updated_at timestamptz default now()
);

-- 2. Inventory Table
create table public.inventory (
  id bigint primary key, -- Using bigint to safely store Date.now() JS timestamps
  store_id text references public.store_settings(id) on delete cascade default 'main-store',
  name text not null,
  category text,
  brand text,
  price numeric not null,
  cost_price numeric default 0,
  size text,
  stock integer default 0,
  min_level integer default 5,
  description text,
  image text, 
  updated_at timestamptz default now()
);

-- 3. Transactions Table
create table public.transactions (
  id bigint primary key,
  store_id text references public.store_settings(id) on delete cascade default 'main-store',
  date timestamptz default now(),
  type text default 'SALE',
  amount numeric not null,
  profit numeric default 0,
  description text
);

-- Enable RLS (Row Level Security) on all new tables
alter table public.store_settings enable row level security;
alter table public.inventory enable row level security;
alter table public.transactions enable row level security;

-- Create open policies for development 
-- ⚠️ IMPORTANT: Tighten these rules when you move to a multi-user production environment!
create policy "Public full access store_settings" on public.store_settings for all using (true) with check (true);
create policy "Public full access inventory" on public.inventory for all using (true) with check (true);
create policy "Public full access transactions" on public.transactions for all using (true) with check (true);

-- Insert the default store record so foreign keys work immediately
insert into public.store_settings (id) values ('main-store') on conflict (id) do nothing;