-- Safe reference data only. This file contains no users, books, transactions,
-- images, credentials, or private legacy data.

insert into public.categories (name, slug)
values
  ('Math', 'math'),
  ('Science', 'science'),
  ('Horror', 'horror'),
  ('Action', 'action'),
  ('Fantasy', 'fantasy'),
  ('Grammar', 'grammar'),
  ('Other / Uncategorized', 'other-uncategorized')
on conflict (slug) do update
set name = excluded.name;
