-- Defense-in-depth controls for private legacy provenance and nullable legacy
-- book ownership. No legacy rows are imported by this migration.

alter table private.legacy_members enable row level security;
alter table private.legacy_category_map enable row level security;
alter table private.legacy_book_links enable row level security;

revoke all on schema private from public, anon, authenticated;

revoke all privileges on table
  private.legacy_members,
  private.legacy_category_map,
  private.legacy_book_links
from public, anon, authenticated;

revoke all privileges on sequence private.legacy_members_id_seq
from public, anon, authenticated;

-- Application roles retain their previously reviewed column-level grants.
-- These new provenance/display-control columns are intentionally excluded.
revoke insert (source_kind, owner_display_name)
on public.books from anon, authenticated;

revoke update (source_kind, owner_display_name)
on public.books from anon, authenticated;

-- Native labels are always resolved from the authenticated owner's profile.
-- This trigger is SECURITY INVOKER and remains subject to the caller's profile
-- SELECT policy. Trusted imports use the legacy branch and a generic label.
create or replace function private.set_book_owner_display_name()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_display_name text;
begin
  if new.source_kind = 'native' then
    select p.display_name
    into v_display_name
    from public.profiles as p
    where p.id = new.owner_id;

    if v_display_name is null then
      raise exception 'A native book requires a valid owner profile.'
        using errcode = '23503';
    end if;

    new.owner_display_name := v_display_name;
  elsif new.owner_display_name is null
        or btrim(new.owner_display_name) = '' then
    new.owner_display_name := 'Community member';
  end if;

  return new;
end;
$$;

revoke all on function private.set_book_owner_display_name()
from public, anon, authenticated;

create trigger books_set_owner_display_name
before insert or update of owner_id, source_kind, owner_display_name
on public.books
for each row execute function private.set_book_owner_display_name();

-- SECURITY DEFINER is required because a profile owner has no direct grant to
-- mutate the system-controlled owner_display_name column on books.
create or replace function private.sync_owned_book_display_name()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.books
  set owner_display_name = new.display_name
  where owner_id = new.id
    and owner_display_name is distinct from new.display_name;

  return new;
end;
$$;

revoke all on function private.sync_owned_book_display_name()
from public, anon, authenticated;

create trigger profiles_sync_owned_book_display_name
after update of display_name on public.profiles
for each row
when (old.display_name is distinct from new.display_name)
execute function private.sync_owned_book_display_name();

-- Preserve the member record if a claimed profile is deleted. Claimed legacy
-- books can safely become ownerless again because their provenance is private.
create or replace function private.release_legacy_profile_claim()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update private.legacy_members
  set claimed_profile_id = null,
      claimed_at = null,
      claim_status = 'review_required'
  where claimed_profile_id = old.id;

  return old;
end;
$$;

revoke all on function private.release_legacy_profile_claim()
from public, anon, authenticated;

create trigger profiles_release_legacy_claim
before delete on public.profiles
for each row execute function private.release_legacy_profile_claim();

drop policy books_insert_own on public.books;

create policy books_insert_own
on public.books
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and source_kind = 'native'
  and status = 'available'
  and is_active
);

drop policy borrow_requests_insert_requester on public.borrow_requests;

create policy borrow_requests_insert_requester
on public.borrow_requests
for insert
to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> owner_id
  and status = 'pending'
  and exists (
    select 1
    from public.books as b
    where b.id = borrow_requests.book_id
      and b.owner_id is not null
      and b.owner_id = borrow_requests.owner_id
      and b.owner_id <> (select auth.uid())
      and b.is_active
      and b.status = 'available'
  )
);

-- SECURITY DEFINER remains necessary because the trigger derives protected
-- participant and workflow fields. The explicit owner check rejects unclaimed
-- legacy books before any notification or loan workflow can begin.
create or replace function private.prepare_borrow_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor_id uuid;
  v_owner_id uuid;
begin
  v_actor_id := (select auth.uid());

  if v_actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select b.owner_id
  into v_owner_id
  from public.books as b
  where b.id = new.book_id
    and b.owner_id is not null
    and b.is_active
    and b.status = 'available';

  if v_owner_id is null then
    raise exception 'The book is not available for requests.' using errcode = 'P0001';
  end if;

  if v_owner_id = v_actor_id then
    raise exception 'A user cannot request their own book.' using errcode = '23514';
  end if;

  new.requester_id := v_actor_id;
  new.owner_id := v_owner_id;
  new.status := 'pending';
  new.expires_at := now() + interval '72 hours';
  new.responded_at := null;
  new.cancelled_at := null;

  return new;
end;
$$;

revoke all on function private.prepare_borrow_request()
from public, anon, authenticated;
