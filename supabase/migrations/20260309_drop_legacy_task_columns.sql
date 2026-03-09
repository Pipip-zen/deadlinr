-- ============================================================
-- Migration: Drop Legacy Columns in Tasks
-- Description:
-- 1. Drops `class_id` and `course_name` from tasks since the 
--    application now operates strictly on a Personal Task basis 
--    using `user_id` and the relational `course_id`.
-- ============================================================

alter table public.tasks
  drop column if exists class_id cascade;

alter table public.tasks
  drop column if exists course_name cascade;
