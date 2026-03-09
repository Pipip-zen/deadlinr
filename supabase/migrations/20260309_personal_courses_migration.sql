-- ============================================================
-- Migration: Personal Courses
-- Description:
-- 1. Drops old Gamified "courses" table if it exists.
-- 2. Creates new "courses" table (personal per user).
-- 3. Adds course_id to tasks with FK to courses.id.
-- ============================================================

-- Drop old gamified courses table since it was for class-wide presets
drop table if exists public.courses cascade;

create table public.courses (
    id         uuid primary key default uuid_generate_v4(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    name       text not null,
    code       text not null,
    color      text not null,
    created_at timestamptz not null default now()
);

-- RLS
alter table public.courses enable row level security;

create policy "courses: user select own"
    on public.courses for select
    to authenticated
    using (auth.uid() = user_id);

create policy "courses: user insert own"
    on public.courses for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "courses: user update own"
    on public.courses for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "courses: user delete own"
    on public.courses for delete
    to authenticated
    using (auth.uid() = user_id);

-- Add course_id to tasks
alter table public.tasks
    add column course_id uuid references public.courses(id) on delete set null;

-- NOTE: The existing 'course_name' column in tasks is kept temporarily for migration
-- or can be safely ignored. To migrate data smoothly, one would need to iterate over
-- distinct course_names, create courses, and update tasks.course_id.
-- If the table is empty or the user doesn't care, we can just start using course_id.
