-- ============================================================
-- TaskTrack — Initial Migration
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. classes
create table public.classes (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- 2. profiles  (linked 1-to-1 with auth.users)
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text,
  avatar_url       text,
  class_id         uuid references public.classes(id) on delete set null,
  role             text not null default 'student'
                     check (role in ('student', 'admin', 'superadmin')),
  streak_count     int not null default 0,
  last_active_date date,
  created_at       timestamptz not null default now()
);

-- 3. tasks
create table public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  course_name text not null,
  title       text not null,
  description text,
  deadline    timestamptz not null,
  created_by  uuid not null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 4. task_completions
create table public.task_completions (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  points_earned int not null default 0,
  unique (task_id, user_id)
);

-- 5. student_points
create table public.student_points (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  total_points int not null default 0,
  updated_at   timestamptz not null default now()
);

-- auto-create student_points row when a profile is created
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.student_points (user_id, total_points, updated_at)
  values (new.id, 0, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

alter table public.classes          enable row level security;
alter table public.profiles         enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;
alter table public.student_points   enable row level security;

-- ----------------------------------------------------------------
-- HELPER: get the authenticated user's profile columns
-- ----------------------------------------------------------------
create or replace function public.my_class_id()
returns uuid language sql stable security definer as $$
  select class_id from public.profiles where id = auth.uid();
$$;

create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------
-- classes — readable by authenticated users
-- ----------------------------------------------------------------
create policy "classes: authenticated read"
  on public.classes for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------
-- profiles — own row read/update
-- ----------------------------------------------------------------
create policy "profiles: own read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: own update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: own insert (on signup)"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- ----------------------------------------------------------------
-- tasks
--   student: select if their class_id matches task.class_id
--   admin:   insert / update if their class_id matches task.class_id
-- ----------------------------------------------------------------
create policy "tasks: student read same class"
  on public.tasks for select
  to authenticated
  using (
    class_id = public.my_class_id()
    and public.my_role() in ('student', 'admin', 'superadmin')
  );

create policy "tasks: admin insert same class"
  on public.tasks for insert
  to authenticated
  with check (
    class_id = public.my_class_id()
    and public.my_role() in ('admin', 'superadmin')
  );

create policy "tasks: admin update same class"
  on public.tasks for update
  to authenticated
  using (
    class_id = public.my_class_id()
    and public.my_role() in ('admin', 'superadmin')
  )
  with check (
    class_id = public.my_class_id()
    and public.my_role() in ('admin', 'superadmin')
  );

-- ----------------------------------------------------------------
-- task_completions — user can insert/read own rows
-- ----------------------------------------------------------------
create policy "task_completions: own insert"
  on public.task_completions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "task_completions: own read"
  on public.task_completions for select
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------
-- student_points — user can read own row
-- (write access granted only via Edge Function with service_role)
-- ----------------------------------------------------------------
create policy "student_points: own read"
  on public.student_points for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
create index tasks_class_id_idx           on public.tasks(class_id);
create index tasks_deadline_idx           on public.tasks(deadline);
create index task_completions_user_idx    on public.task_completions(user_id);
create index task_completions_task_idx    on public.task_completions(task_id);
create index profiles_class_id_idx        on public.profiles(class_id);
