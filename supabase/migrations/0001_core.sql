-- ═══════════════════════════════════════════════════════════════════════════
-- LUMINA — single-creator premium fan platform · core schema
-- 0001_core.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── profiles (extends auth.users) ─────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text,
  email text,
  avatar_url text,
  bio text,
  role text not null default 'USER' check (role in ('USER','CREATOR','ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','DELETED')),
  notif_preferences jsonb not null default '{"email": true, "inApp": true}',
  privacy_preferences jsonb not null default '{"publicProfile": true}',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── creator profile (singleton) ───────────────────────────────────────────
create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references public.profiles (id) on delete cascade,
  cover_url text,
  tagline text,
  social_links jsonb not null default '{}',
  verification_status text not null default 'PENDING' check (verification_status in ('VERIFIED','PENDING','REJECTED')),
  about text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- singleton: only one creator profile row can ever exist (constant unique index)
create unique index if not exists creator_singleton on public.creator_profiles ((1));

-- ─── platform settings (singleton) ─────────────────────────────────────────
create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  platform_name text not null default 'Lumina',
  messaging_enabled boolean not null default true,
  messaging_policy text not null default 'ALL_USERS' check (messaging_policy in ('ALL_USERS','SUBSCRIBERS_ONLY','DISABLED')),
  comments_enabled boolean not null default true,
  tips_enabled boolean not null default true,
  ppv_enabled boolean not null default true,
  bundles_enabled boolean not null default true,
  promotions_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  age_gate_required boolean not null default true,
  min_tip_amount numeric(12,2) not null default 5,
  reminder_days jsonb not null default '[7,3,1]',
  updated_at timestamptz not null default now()
);

-- ─── subscription plans ────────────────────────────────────────────────────
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'USD',
  billing_interval text not null default 'month' check (billing_interval in ('month','year')),
  description text,
  benefits jsonb not null default '[]',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── subscriptions ─────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled','suspended')),
  started_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id) where (status = 'active');
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, status);
create index if not exists subscriptions_expires_idx on public.subscriptions (expires_at) where status = 'active';

-- ─── media vault folders + assets ──────────────────────────────────────────
create table if not exists public.vault_folders (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (creator_id, name)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  thumb_path text,
  preview_path text,
  filename text not null,
  mime_type text not null,
  size bigint not null check (size >= 0),
  width int,
  height int,
  duration numeric,
  folder_id uuid references public.vault_folders (id) on delete set null,
  tags text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_assets_creator_idx on public.media_assets (creator_id, created_at desc);
create index if not exists media_assets_folder_idx on public.media_assets (folder_id);
create index if not exists media_assets_tags_idx on public.media_assets using gin (tags);

-- ─── posts ─────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  caption text not null default '',
  visibility text not null check (visibility in ('PUBLIC','REGISTERED','SUBSCRIBERS','PPV')),
  price numeric(12,2) check (price is null or price >= 0),
  preview_asset_id uuid references public.media_assets (id) on delete set null,
  tags text[] not null default '{}',
  featured boolean not null default false,
  pinned boolean not null default false,
  status text not null default 'published' check (status in ('draft','scheduled','published','archived','deleted')),
  scheduled_at timestamptz,
  view_count int not null default 0,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  constraint ppv_needs_price check (visibility <> 'PPV' or (price is not null and price > 0))
);
create index if not exists posts_feed_idx on public.posts (published_at desc nulls first) where status = 'published' and deleted_at is null;
create index if not exists posts_creator_idx on public.posts (creator_id, published_at desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  asset_id uuid not null references public.media_assets (id),
  position int not null default 0,
  unique (post_id, asset_id)
);
create index if not exists post_media_post_idx on public.post_media (post_id, position);

-- ─── engagement ────────────────────────────────────────────────────────────
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
create index if not exists likes_post_idx on public.likes (post_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  hidden boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.saved_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  asset_id uuid not null references public.media_assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table if not exists public.post_views (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists post_views_post_idx on public.post_views (post_id, created_at desc);

-- ─── content bundles ───────────────────────────────────────────────────────
create table if not exists public.content_bundles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  cover_asset_id uuid references public.media_assets (id) on delete set null,
  price numeric(12,2) not null check (price > 0),
  currency text not null default 'USD',
  status text not null default 'active' check (status in ('active','inactive','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.content_bundles (id) on delete cascade,
  item_type text not null check (item_type in ('post','media_asset')),
  post_id uuid references public.posts (id) on delete cascade,
  asset_id uuid references public.media_assets (id) on delete cascade,
  unique (bundle_id, post_id, asset_id)
);

-- ─── promotions ────────────────────────────────────────────────────────────
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  code text unique,
  discount_pct numeric(5,2) not null check (discount_pct > 0 and discount_pct <= 100),
  description text,
  banner_text text,
  target_plan_id uuid references public.subscription_plans (id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_redemptions int,
  redemption_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (promotion_id, user_id)
);

-- ─── referrals ─────────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid unique not null references public.profiles (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','subscribed','rewarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_type text not null,
  amount numeric(12,2),
  status text not null default 'pending' check (status in ('pending','granted','cancelled')),
  granted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── payouts ───────────────────────────────────────────────────────────────
create table if not exists public.payout_records (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled')),
  period_start timestamptz,
  period_end timestamptz,
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper functions
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE'
  );
$$;

create or replace function public.is_creator(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.creator_profiles cp on cp.profile_id = p.id
    where p.id = uid and p.role = 'CREATOR' and p.status = 'ACTIVE'
  );
$$;

create or replace function public.user_role(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = uid;
$$;

create or replace function public.has_active_subscription(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

-- updated_at toucher
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','creator_profiles','subscriptions','media_assets','posts','content_bundles','platform_settings'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- like/comment/saved counters
create or replace function public.bump_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_like_count on public.likes;
create trigger trg_like_count after insert or delete on public.likes
  for each row execute function public.bump_post_like();

create or replace function public.bump_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and not new.hidden) then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif (tg_op = 'UPDATE' and old.hidden <> new.hidden) then
    update public.posts
    set comment_count = greatest(comment_count + case when new.hidden then -1 else 1 end, 0)
    where id = new.post_id;
  elsif (tg_op = 'DELETE' and not old.hidden) then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_count on public.comments;
create trigger trg_comment_count after insert or update or delete on public.comments
  for each row execute function public.bump_post_comment();

-- new auth.users → profile (username auto-derived)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-z0-9_]', '', 'g'));
  if base is null or length(base) < 3 then base := 'user'; end if;
  base := left(base, 30);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := left(base, 26) || n::text;
  end loop;

  insert into public.profiles (id, username, email, display_name)
  values (new.id, candidate, new.email, coalesce(new.raw_user_meta_data->>'display_name', candidate));

  -- referral capture: ?ref=username stored in signup metadata
  if new.raw_user_meta_data ? 'ref_username' then
    insert into public.referrals (referrer_id, referred_id)
    select p.id, new.id from public.profiles p
    where p.username = new.raw_user_meta_data->>'ref_username'
      and p.id <> new.id
    on conflict (referred_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- last login tracking
create or replace function public.touch_last_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_login_at = now() where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_last_login on auth.users;
create trigger on_auth_last_login
  after update on auth.users
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  for each row execute function public.touch_last_login();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS: enable on every table. Policies use the helper fns; service-role
-- bypasses RLS for trusted server-side business logic.
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.platform_settings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.vault_folders enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.saved_posts enable row level security;
alter table public.saved_media enable row level security;
alter table public.post_views enable row level security;
alter table public.content_bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.payout_records enable row level security;

-- profiles: public read of basic fields, self-update limited fields
create policy profiles_read_all on public.profiles
  for select to authenticated using (true);
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()) and status = 'ACTIVE');

-- creator profile: everyone authenticated can read; creator updates own
create policy creator_profile_read on public.creator_profiles
  for select to authenticated using (true);
create policy creator_profile_update on public.creator_profiles
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- platform settings: authenticated read, admin write
create policy settings_read on public.platform_settings
  for select to authenticated using (true);
create policy settings_admin_write on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- plans: read for authenticated; admin manage
create policy plans_read on public.subscription_plans
  for select to authenticated using (true);
create policy plans_admin_all on public.subscription_plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- subscriptions: user reads own; creator reads all; writes via service role only
create policy subs_read_own on public.subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_creator() or public.is_admin());

-- vault folders
create policy folders_creator on public.vault_folders
  for all to authenticated using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid());

-- media assets
create policy assets_creator on public.media_assets
  for all to authenticated using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid());
create policy assets_read_all_auth on public.media_assets
  for select to authenticated using (true);

-- posts: public read of published; creator full control; drafts creator-only
create policy posts_read on public.posts
  for select to authenticated, anon using (
    status = 'published' and deleted_at is null
    or creator_id = auth.uid()
    or public.is_admin()
  );
create policy posts_creator_write on public.posts
  for all to authenticated using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy posts_admin_write on public.posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- post media: same visibility as parent post
create policy post_media_read on public.post_media
  for select to authenticated, anon using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.status = 'published' and p.deleted_at is null or p.creator_id = auth.uid() or public.is_admin())
    )
  );
create policy post_media_creator on public.post_media
  for all to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id and p.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.posts p where p.id = post_id and p.creator_id = auth.uid())
  );

-- likes: insert/delete own; read all
create policy likes_read on public.likes
  for select to authenticated using (true);
create policy likes_write_own on public.likes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- comments
create policy comments_read on public.comments
  for select to authenticated, anon using (not hidden or user_id = auth.uid() or public.is_admin() or public.is_creator());
create policy comments_write_own on public.comments
  for insert to authenticated with check (user_id = auth.uid());
create policy comments_delete_own on public.comments
  for delete to authenticated using (user_id = auth.uid());
create policy comments_moderate on public.comments
  for update to authenticated using (public.is_creator() or public.is_admin()) with check (true);

-- saved posts / media
create policy saved_posts_own on public.saved_posts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_media_own on public.saved_media
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- post views
create policy views_insert on public.post_views
  for insert to authenticated with check (true);

-- bundles: public read active; creator manage
create policy bundles_read on public.content_bundles
  for select to authenticated, anon using (status = 'active' or creator_id = auth.uid() or public.is_admin());
create policy bundles_creator on public.content_bundles
  for all to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy bundle_items_read on public.bundle_items
  for select to authenticated, anon using (
    exists (select 1 from public.content_bundles b where b.id = bundle_id and (b.status = 'active' or b.creator_id = auth.uid() or public.is_admin()))
  );
create policy bundle_items_creator on public.bundle_items
  for all to authenticated using (
    exists (select 1 from public.content_bundles b where b.id = bundle_id and b.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.content_bundles b where b.id = bundle_id and b.creator_id = auth.uid())
  );

-- promotions: public read active; creator manage
create policy promos_read on public.promotions
  for select to authenticated, anon using (active or creator_id = auth.uid() or public.is_admin());
create policy promos_creator on public.promotions
  for all to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy promo_redemptions_read on public.promotion_redemptions
  for select to authenticated using (user_id = auth.uid() or public.is_creator() or public.is_admin());

-- referrals
create policy referrals_read_own on public.referrals
  for select to authenticated using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());
create policy rewards_read_own on public.referral_rewards
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- payouts: creator/admin read only
create policy payouts_read on public.payout_records
  for select to authenticated using (creator_id = auth.uid() or public.is_admin());
