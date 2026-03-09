-- ============================================================
-- Migration: Add completed_at to tasks
-- Description: Supports tracking the exact timestamp a task is marked done
-- ============================================================

ALTER TABLE public.tasks
ADD COLUMN completed_at timestamp with time zone;
