-- ═══════════════════════════════════════════════════════════════════════════
-- LUMINA · storage buckets, storage policies, singleton seed data
-- 0003_seed.sql
-- Default accounts (CHANGE PASSWORDS after first login):
--   creator@lumina.local / Creator#2026!
--   admin@lumina.local   / Admin#2026!
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ─── storage buckets ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',  'avatars',  true,  5242880,   array['image/png','image/jpeg','image/webp','image/gif']),
  ('branding', 'branding', true,  15728640,  array['image/png','image/jpeg','image/webp']),
  ('vault',    'vault',    false, 209715200, array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── storage policies ──────────────────────────────────────────────────────
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding_public_read" on storage.objects;
create policy "branding_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'branding');

drop policy if exists "branding_creator_write" on storage.objects;
create policy "branding_creator_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'branding' and (public.is_creator() or public.is_admin()))
  with check (bucket_id = 'branding' and (public.is_creator() or public.is_admin()));

-- vault: strictly private. Creator touches only their own folder; admin too.
drop policy if exists "vault_creator_rw" on storage.objects;
create policy "vault_creator_rw" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'vault'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'vault'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: platform settings, creator, admin, plan, starter content
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

-- creator account
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new
)
values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated',
  'creator@lumina.local',
  extensions.crypt('Creator#2026!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Aurora Luxe"}'::jsonb,
  now(), now(), '', '', '', ''
)
on conflict (email) do nothing;

-- admin account
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new
)
values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated',
  'admin@lumina.local',
  extensions.crypt('Admin#2026!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(), '', '', '', ''
)
on conflict (email) do nothing;

-- creator profile promotion + singleton creator_profiles row
update public.profiles
set username = 'aurora',
    display_name = 'Aurora Luxe',
    role = 'CREATOR',
    bio = 'Cinematic. Intimate. Yours.'
where email = 'creator@lumina.local';

insert into public.creator_profiles (profile_id, tagline, about, verification_status, social_links)
select id,
       'Cinematic. Intimate. Yours.',
       'Welcome to my private world — exclusive photo sets, cinematic videos and direct access to me. Subscribers see everything first.',
       'VERIFIED',
       '{"instagram":"https://instagram.com/","x":"https://x.com/","tiktok":"https://tiktok.com/"}'::jsonb
from public.profiles
where email = 'creator@lumina.local'
on conflict (profile_id) do nothing;

update public.profiles set role = 'ADMIN' where email = 'admin@lumina.local';

-- default subscription plan
insert into public.subscription_plans (name, price, currency, billing_interval, description, benefits, sort_order)
select 'Lumina Exclusive', 14.99, 'USD', 'month',
       'Full access to the subscriber-only feed.',
       '["Unlimited subscriber-only posts","Exclusive photo sets & videos","Direct private messaging","Members-only offers","Early access to new drops"]'::jsonb,
       0
where not exists (select 1 from public.subscription_plans);

-- default vault folders
insert into public.vault_folders (creator_id, name)
select id, f
from public.profiles, unnest(array['Photos','Videos','Favorites','PPV']) as f
where email = 'creator@lumina.local'
on conflict (creator_id, name) do nothing;

-- starter content (text posts — media is added through the vault by the creator)
insert into public.posts (creator_id, title, caption, visibility, status, pinned, published_at, tags)
select p.id, 'Welcome to my world',
       'I''m Aurora — this is my private universe. Follow the feed for free teasers, subscribe for the full experience, and DM me anytime. ✨',
       'PUBLIC', 'published', true, now(), array['welcome']
from public.profiles p
where p.email = 'creator@lumina.local'
  and not exists (select 1 from public.posts);

insert into public.posts (creator_id, title, caption, visibility, status, published_at, tags)
select p.id, 'Behind the veil',
       'Tonight''s subscriber-only story: the shoot nobody else gets to see. Join the inner circle to read it all.',
       'SUBSCRIBERS', 'published', now(), array['exclusive']
from public.profiles p
where p.email = 'creator@lumina.local'
  and not exists (select 1 from public.posts);

insert into public.posts (creator_id, title, caption, visibility, price, status, published_at, tags)
select p.id, 'Midnight set — full series',
       'The complete midnight photo series: 24 unedited frames, the ones that never made the public feed.',
       'PPV', 9.99, 'published', now(), array['ppv','premium']
from public.profiles p
where p.email = 'creator@lumina.local'
  and not exists (select 1 from public.posts);

insert into public.posts (creator_id, title, caption, visibility, status, scheduled_at, tags)
select p.id, 'Studio session (draft)',
       'Draft: write the caption before publishing.',
       'PUBLIC', 'draft', null, array['studio']
from public.profiles p
where p.email = 'creator@lumina.local'
  and not exists (select 1 from public.posts);

-- welcome promotion
insert into public.promotions (creator_id, name, code, discount_pct, banner_text, description, target_plan_id)
select p.id, 'First month 20% off', 'WELCOME20', 20,
       'Join today — first month 20% off with code WELCOME20',
       'New members get 20% off their first month.',
       (select id from public.subscription_plans limit 1)
from public.profiles p
where p.email = 'creator@lumina.local'
  and not exists (select 1 from public.promotions);
