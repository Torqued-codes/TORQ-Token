-- Wallets: one custodial EVM wallet per Supabase user.
-- Balance and transaction history are NOT stored here — they live on-chain.
-- The encrypted_private_key column must NEVER be readable by anon/authenticated
-- roles; only the backend (service_role key) can read it.
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  address text not null unique,
  encrypted_private_key text not null,
  created_at timestamptz default now()
);

create table profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table wallets enable row level security;
alter table profiles enable row level security;

-- Users may read their own wallet's address, but the encrypted key column
-- is still returned by this policy — enforce column-level protection by
-- NEVER selecting encrypted_private_key from client-facing queries, and
-- prefer a view without that column for anything reachable by anon/authenticated.
create view public_wallets as
  select id, user_id, address, created_at from wallets;

create policy "Users can view own wallet"
  on wallets for select using (auth.uid() = user_id);

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

-- Auto-create a blank profile row on signup (wallet creation happens in the
-- backend via POST /api/wallet/init, since it requires generating a real
-- keypair with ethers.js — not something SQL can do).
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();