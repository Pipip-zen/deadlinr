-- Fix task updates failing due to missing profiles.role column by dropping the legacy my_role() function and its dependent policies
drop function if exists public.my_role() cascade;
