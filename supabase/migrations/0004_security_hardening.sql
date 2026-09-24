-- ═══════════════════════════════════════════════════════════════════════════
-- LUMINA · security hardening (post-audit)
-- 0004_security_hardening.sql — safe to re-run; every statement is idempotent
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. can_access_post: REGISTERED posts must require an authenticated user ─
-- The access oracle previously treated REGISTERED like PUBLIC, so anonymous
-- users could pass can_access_post for REGISTERED posts — and
-- resolveMediaAccess would hand them 10-minute signed URLs for those posts'
-- vault media with no account at all. Anonymous = no access.
create or replace function public.can_access_post(p_user uuid, p_post uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts post
    where post.id = p_post
      and post.status = 'published'
      and post.deleted_at is null
      and (
        post.visibility = 'PUBLIC'
        or (p_user is not null and post.visibility = 'REGISTERED')
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

-- ─── 2. SECURITY DEFINER helpers must not be client-callable ────────────────
-- PostgREST exposes any function the calling role can EXECUTE, and Postgres
-- grants EXECUTE to PUBLIC by default. An anonymous caller could otherwise:
--   • bump_content_analytics    → corrupt per-post purchase/revenue analytics
--   • bump_promotion_redemption → exhaust a promo code's redemption cap
--   • can_access_post           → use the authorization oracle from the edge
-- Revoke PUBLIC, re-grant to service_role only. (is_admin / is_creator /
-- has_active_subscription stay PUBLIC: RLS evaluates them AS the caller.)
revoke execute on function public.bump_content_analytics(uuid, int, numeric) from public;
revoke execute on function public.bump_promotion_redemption(uuid) from public;
revoke execute on function public.can_access_post(uuid, uuid) from public;
grant execute on function public.bump_content_analytics(uuid, int, numeric) to service_role;
grant execute on function public.bump_promotion_redemption(uuid) to service_role;
grant execute on function public.can_access_post(uuid, uuid) to service_role;

-- ─── 3. Hard cap on attachments per message (schema-level invariant) ────────
-- The API caps each message at 10 attachments and forbids fan-set prices, but
-- a trigger enforces the invariant at the database itself. (A CHECK constraint
-- cannot contain a subquery in Postgres, hence the trigger.)
create or replace function public.enforce_message_media_cap()
returns trigger language plpgsql as $$
declare n int;
begin
  select count(*) into n from public.message_media where message_id = new.message_id;
  if n > 50 then
    raise exception 'message_media cap exceeded (max 50 per message)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_message_media_cap on public.message_media;
create trigger trg_message_media_cap
  after insert on public.message_media
  for each row execute function public.enforce_message_media_cap();
