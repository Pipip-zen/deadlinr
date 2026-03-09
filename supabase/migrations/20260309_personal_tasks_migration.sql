-- ============================================================
-- Migration: Remove Gamification, Pivot to Personal Tasks
-- Description:
-- 1. Drops student_points and task_completions tables (and triggers)
-- 2. Removes role, streak_count, last_active_date from profiles
-- 3. Modifies tasks to be personal (adds user_id, drops created_by)
-- 4. Tightens RLS to personal only
-- ============================================================

-- 1. Clean up dependencies related to dropped tables
drop trigger if exists on_profile_created on public.profiles;
drop function if exists public.handle_new_profile();

-- Drop gamification and completion tables entirely
drop table if exists public.task_completions cascade;
drop table if exists public.student_points cascade;

-- 2. Modify `profiles` table (and dependent policies)
-- First drop policies that depend on profiles.role
drop policy if exists "Admins can insert courses" on public.courses;
drop policy if exists "Admins can delete courses" on public.courses;

-- Now safe to drop columns
alter table public.profiles
  drop column if exists role,
  drop column if exists streak_count,
  drop column if exists last_active_date;

-- Re-create courses policy (Anyone can manage courses now that admins are gone, or just authenticated users)
create policy "Authenticated users can insert courses"
  on public.courses for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete courses"
  on public.courses for delete
  using (is_preset = false and auth.role() = 'authenticated');

-- 3. Modify `tasks` table
-- Since tasks are now strictly personal, existing class-wide tasks
-- don't belong to a specific student owner. We truncate to prevent
-- constraint violations when adding `user_id` as NOT NULL.
truncate table public.tasks cascade;

alter table public.tasks
  drop column if exists created_by;

alter table public.tasks
  add column user_id uuid not null references auth.users(id) on delete cascade;

-- Added derived status column as a stored string for simplicity over ENUM
alter table public.tasks
  add column status text not null default 'pending' check (status in ('pending', 'done', 'overdue'));

-- 4. Recreate RLS Policies
-- First, drop existing policies
drop policy if exists "Enable read access for all users" on public.profiles;
drop policy if exists "Enable insert for authenticated users only" on public.profiles;
drop policy if exists "Enable update for users based on email" on public.profiles;
drop policy if exists "Enable update for users based on id" on public.profiles;
drop policy if exists "profiles: own read" on public.profiles;
drop policy if exists "profiles: own update" on public.profiles;
drop policy if exists "profiles: admin read same class" on public.profiles;

drop policy if exists "tasks: student read same class" on public.tasks;
drop policy if exists "tasks: admin insert" on public.tasks;
drop policy if exists "tasks: admin update" on public.tasks;
drop policy if exists "tasks: admin delete" on public.tasks;
drop policy if exists "tasks: admin delete same class" on public.tasks;

-- Re-create `profiles` policies (Personal only)
create policy "profiles: select own row"
  on public.profiles for select
  to authenticated
  using ( auth.uid() = id );

create policy "profiles: update own row"
  on public.profiles for update
  to authenticated
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "profiles: insert own row"
  on public.profiles for insert
  to authenticated
  with check ( auth.uid() = id );

-- Re-create `tasks` policies (Personal only)
create policy "tasks: select own"
  on public.tasks for select
  to authenticated
  using ( auth.uid() = user_id );

create policy "tasks: insert own"
  on public.tasks for insert
  to authenticated
  with check ( auth.uid() = user_id );

create policy "tasks: update own"
  on public.tasks for update
  to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "tasks: delete own"
  on public.tasks for delete
  to authenticated
  using ( auth.uid() = user_id );

-- Ensure `classes` table policy: all authenticated users can read
drop policy if exists "classes: anyone can read" on public.classes;
create policy "classes: anyone can read"
  on public.classes for select
  to authenticated
  using ( true );
