-- ============================================================
-- Fix: Add missing DELETE policy for tasks table
-- ============================================================
create policy "tasks: admin delete same class"
  on public.tasks for delete
  to authenticated
  using (
    class_id = public.my_class_id()
    and public.my_role() in ('admin', 'superadmin')
  );

-- ============================================================
-- Fix: Allow admins to read ALL profiles in their class
-- (needed for completion viewer and task_completions admin view)
-- ============================================================
create policy "profiles: admin read same class"
  on public.profiles for select
  to authenticated
  using (
    class_id = public.my_class_id()
    and public.my_role() in ('admin', 'superadmin')
  );

-- ============================================================
-- Fix: Allow admins to read ALL task_completions for their class tasks
-- ============================================================
create policy "task_completions: admin read same class"
  on public.task_completions for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_completions.task_id
        and t.class_id = public.my_class_id()
        and public.my_role() in ('admin', 'superadmin')
    )
  );
