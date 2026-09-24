-- ═══════════════════════════════════════════════════════════════════════════
-- LUMINA · payments, purchases, tips, messaging, notifications, moderation
-- 0002_commerce.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── payments (unified ledger) ─────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  creator_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('SUBSCRIPTION','PPV','TIP','BUNDLE','PAID_MESSAGE')),
  reference_id uuid,                    -- subscription / post / tip / bundle / message id
  provider text not null default 'nowpayments',
  provider_payment_id text unique,
  pay_address text,
  pay_amount numeric(20,8),
  pay_currency text,
  invoice_url text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  actual_amount_paid numeric(20,8),
  actually_paid_currency text,
  transaction_hash text,
  network text,
  status text not null default 'pending' check (status in ('pending','confirming','completed','failed','expired','cancelled','refunded')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_creator_idx on public.payments (creator_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_type_idx on public.payments (type, created_at desc);
create index if not exists payments_ref_idx on public.payments (type, reference_id);

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists payment_events_payment_idx on public.payment_events (payment_id, created_at);

create table if not exists public.webhook_deliveries (
  id bigint generated always as identity primary key,
  provider text not null default 'nowpayments',
  event_id text,
  signature_valid boolean,
  processed boolean not null default false,
  result text,
  payload jsonb not null default '{}',
  received_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_event_idx on public.webhook_deliveries (provider, event_id);

-- ─── PPV purchases ─────────────────────────────────────────────────────────
create table if not exists public.post_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  payment_id uuid unique references public.payments (id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'completed' check (status in ('pending','completed','refunded')),
  created_at timestamptz not null default now(),
  unique (user_id, post_id)              -- ← duplicate purchase impossible
);
create index if not exists post_purchases_user_idx on public.post_purchases (user_id, created_at desc);
create index if not exists post_purchases_post_idx on public.post_purchases (post_id);

-- ─── tips ──────────────────────────────────────────────────────────────────
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  payment_id uuid unique references public.payments (id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  message text check (length(message) <= 500),
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  created_at timestamptz not null default now()
);
create index if not exists tips_creator_idx on public.tips (creator_id, created_at desc);
create index if not exists tips_user_idx on public.tips (user_id, created_at desc);

-- ─── bundle purchases ──────────────────────────────────────────────────────
create table if not exists public.bundle_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bundle_id uuid not null references public.content_bundles (id) on delete cascade,
  payment_id uuid unique references public.payments (id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'completed' check (status in ('pending','completed','refunded')),
  created_at timestamptz not null default now(),
  unique (user_id, bundle_id)
);
create index if not exists bundle_purchases_user_idx on public.bundle_purchases (user_id, created_at desc);

-- ─── messaging ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  fan_unread int not null default 0,
  creator_unread int not null default 0,
  fan_archived boolean not null default false,
  creator_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (fan_id, creator_id)            -- one conversation per fan↔creator pair
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (length(body) <= 5000),
  status text not null default 'sent' check (status in ('sent','read')),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

create table if not exists public.message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  asset_id uuid not null references public.media_assets (id),
  price numeric(12,2) check (price is null or price >= 0),
  purchase_required boolean not null default false,
  position int not null default 0
);
create index if not exists message_media_message_idx on public.message_media (message_id, position);

create table if not exists public.message_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  asset_id uuid references public.media_assets (id) on delete set null,
  payment_id uuid unique references public.payments (id) on delete set null,
  amount numeric(12,2) not null,
  status text not null default 'completed' check (status in ('pending','completed','refunded')),
  purchased_at timestamptz not null default now(),
  unique (user_id, message_id, asset_id)
);
create index if not exists message_purchases_user_idx on public.message_purchases (user_id, purchased_at desc);

-- ─── notifications ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'NEW_POST','NEW_MESSAGE','MESSAGE_READ','SUBSCRIPTION_ACTIVE','SUBSCRIPTION_EXPIRING',
    'SUBSCRIPTION_EXPIRED','PPV_PURCHASE','TIP_RECEIVED','PAYMENT_CONFIRMED','PROMOTION',
    'CREATOR_UPDATE','BUNDLE_PURCHASE','REPORT_RESOLVED','SYSTEM'
  )),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where not read;

-- ─── moderation & admin ────────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','message','user','bundle')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','harassment','impersonation','copyright','illegal','other')),
  details text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);

create table if not exists public.creator_analytics (
  day date not null,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  subscribers_active int not null default 0,
  new_subscribers int not null default 0,
  lost_subscribers int not null default 0,
  subscription_revenue numeric(12,2) not null default 0,
  ppv_revenue numeric(12,2) not null default 0,
  tip_revenue numeric(12,2) not null default 0,
  message_revenue numeric(12,2) not null default 0,
  bundle_revenue numeric(12,2) not null default 0,
  new_users int not null default 0,
  primary key (creator_id, day)
);

create table if not exists public.content_analytics (
  post_id uuid primary key references public.posts (id) on delete cascade,
  preview_views int not null default 0,
  unlock_clicks int not null default 0,
  purchases int not null default 0,
  revenue numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.post_purchases enable row level security;
alter table public.tips enable row level security;
alter table public.bundle_purchases enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_media enable row level security;
alter table public.message_purchases enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;
alter table public.admin_actions enable row level security;
alter table public.creator_analytics enable row level security;
alter table public.content_analytics enable row level security;

-- payments: owner + creator read only. Writes happen exclusively via service role.
create policy payments_read_own on public.payments
  for select to authenticated using (
    user_id = auth.uid()
    or creator_id = auth.uid()
    or public.is_admin()
  );

create policy payment_events_read on public.payment_events
  for select to authenticated using (
    exists (select 1 from public.payments p where p.id = payment_id and (p.user_id = auth.uid() or p.creator_id = auth.uid() or public.is_admin()))
  );

-- purchases: buyer + creator read; insert only via service role after payment verification
create policy ppv_read on public.post_purchases
  for select to authenticated using (
    user_id = auth.uid()
    or creator_id = auth.uid()
    or public.is_admin()
  );

create policy tips_read on public.tips
  for select to authenticated using (
    user_id = auth.uid()
    or creator_id = auth.uid()
    or public.is_admin()
  );

create policy bundle_purchases_read on public.bundle_purchases
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.content_bundles b where b.id = bundle_id and b.creator_id = auth.uid())
    or public.is_admin()
  );

-- conversations: only the two participants (or admin)
create policy conv_read on public.conversations
  for select to authenticated using (
    fan_id = auth.uid() or creator_id = auth.uid() or public.is_admin()
  );
create policy conv_insert_fan on public.conversations
  for insert to authenticated with check (fan_id = auth.uid());
create policy conv_update_participants on public.conversations
  for update to authenticated using (fan_id = auth.uid() or creator_id = auth.uid());

-- messages: participants read; sender inserts
create policy messages_read on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    ) or public.is_admin()
  );
create policy messages_insert_sender on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    )
  );
create policy messages_update_sender on public.messages
  for update to authenticated using (sender_id = auth.uid());

create policy msg_media_read on public.message_media
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    ) or public.is_admin()
  );
create policy msg_media_sender on public.message_media
  for all to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  );

create policy msg_purchases_read on public.message_purchases
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id and c.creator_id = auth.uid()
    )
    or public.is_admin()
  );

-- notifications: owner only
create policy notif_read_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notif_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- reports: reporter sees own; admin sees all
create policy reports_read on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin_update on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- blocks: private to the blocker
create policy blocks_own on public.blocked_users
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy blocks_read_creator on public.blocked_users
  for select to authenticated using (blocked_id = auth.uid() or public.is_admin());

-- audit log: admin read; writes via service role
create policy audit_admin_read on public.admin_actions
  for select to authenticated using (public.is_admin());

-- analytics: creator/admin read
create policy creator_analytics_read on public.creator_analytics
  for select to authenticated using (creator_id = auth.uid() or public.is_admin());
create policy content_analytics_read on public.content_analytics
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id and (p.creator_id = auth.uid() or public.is_admin()))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Canonical access-control function — the single source of truth for
-- "can this user view this post?" (subscription / PPV / bundle / free)
-- Used by policies AND the API layer.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.can_access_post(p_user uuid, p_post uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts post
    where post.id = p_post
      and post.status = 'published'
      and post.deleted_at is null
      and (
        post.visibility in ('PUBLIC','REGISTERED')
        or (p_user is not null and post.creator_id = p_user)
        or (p_user is not null and public.has_active_subscription(p_user) and post.visibility = 'SUBSCRIBERS')
        or (
          p_user is not null
          and exists (
            select 1 from public.post_purchases pp
            where pp.user_id = p_user and pp.post_id = post.id and pp.status = 'completed'
          )
        )
        or (
          p_user is not null
          and exists (
            select 1 from public.bundle_purchases bp
            join public.bundle_items bi on bi.bundle_id = bp.bundle_id
            where bp.user_id = p_user
              and bp.status = 'completed'
              and bi.post_id = post.id
          )
        )
      )
  );
$$;

comment on function public.can_access_post(uuid, uuid) is
  'Single source of truth for post access: free / registration / active subscription / verified PPV purchase / bundle purchase. Purchases survive subscription expiry.';

-- additive analytics bumpers used by the fulfillment engine
create or replace function public.bump_content_analytics(p_post uuid, p_purchases int, p_revenue numeric)
returns void language sql security definer set search_path = public as $$
  insert into public.content_analytics (post_id, preview_views, unlock_clicks, purchases, revenue)
  values (p_post, 0, 0, p_purchases, p_revenue)
  on conflict (post_id) do update
    set purchases = public.content_analytics.purchases + excluded.purchases,
        revenue = public.content_analytics.revenue + excluded.revenue,
        updated_at = now();
$$;

create or replace function public.bump_promotion_redemption(p_promotion uuid)
returns void language sql security definer set search_path = public as $$
  update public.promotions
  set redemption_count = redemption_count + 1
  where id = p_promotion;
$$;
