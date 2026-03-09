-- ============================================================
-- Add courses table for TRM course management
-- ============================================================

create table public.courses (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  class_id   uuid references public.classes(id) on delete set null,
  is_preset  boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.courses enable row level security;

-- Anyone authenticated can read courses
create policy "Authenticated users can read courses"
  on public.courses for select
  using (auth.role() = 'authenticated');

-- Only admins and superadmins can insert / delete
create policy "Admins can insert courses"
  on public.courses for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create policy "Admins can delete courses"
  on public.courses for delete
  using (
    is_preset = false and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- ── Seed: 8 preset TRM courses ────────────────────────────────
insert into public.courses (name, is_preset) values
  ('Digital Marketing',               true),
  ('Jaringan Multimedia',             true),
  ('Desain UI/UX',                    true),
  ('Pemrograman Mobile',              true),
  ('Praktikum Pemrograman Mobile',    true),
  ('Metodologi Penelitian',           true),
  ('Teknologi Web Multimedia',        true),
  ('Piranti Elektronika',             true);
