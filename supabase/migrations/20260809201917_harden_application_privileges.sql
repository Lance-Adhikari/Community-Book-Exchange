-- Supabase projects may grant broad Data API privileges to new public tables
-- through database defaults. Reset every application table to least privilege
-- before granting only the operations required by the reviewed RLS model.

revoke all privileges on table
  public.profiles,
  public.categories,
  public.books,
  public.book_images,
  public.borrow_requests,
  public.loans,
  public.notifications
from anon, authenticated;

revoke all privileges on all sequences in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.books to anon, authenticated;
grant select on public.book_images to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (
  display_name,
  first_name,
  last_name,
  phone,
  city,
  bio,
  avatar_path
) on public.profiles to authenticated;

grant insert (
  owner_id,
  title,
  author,
  category_id,
  published_year,
  isbn,
  description,
  condition,
  cover_path
) on public.books to authenticated;
grant update (
  title,
  author,
  category_id,
  published_year,
  isbn,
  description,
  condition,
  cover_path,
  is_active
) on public.books to authenticated;
grant delete on public.books to authenticated;

grant insert, update, delete on public.book_images to authenticated;
grant select on public.borrow_requests to authenticated;
grant insert (book_id, message) on public.borrow_requests to authenticated;
grant select on public.loans to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant usage, select on sequence public.books_id_seq to authenticated;
grant usage, select on sequence public.book_images_id_seq to authenticated;
