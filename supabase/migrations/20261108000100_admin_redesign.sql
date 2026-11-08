-- ==============================================================================
-- AttendX Admin Redesign & Timetable Management Centre Migration
-- Migration: 20261108_admin_redesign.sql
-- Idempotent Supabase DDL with Row Level Security (RLS) & Scope Boundaries
-- ==============================================================================

-- 1. Ensure student_profiles has roll_number / registration_number column
ALTER TABLE public.student_profiles 
  ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_student_profiles_roll_number 
  ON public.student_profiles(roll_number);

CREATE INDEX IF NOT EXISTS idx_student_profiles_managed_scope 
  ON public.student_profiles(managed_branch_code, managed_section, managed_batch);

-- 2. Published Timetable Versions Table for Tracking Admin Publications & Audits
CREATE TABLE IF NOT EXISTS public.published_timetable_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_code VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL,
    batch VARCHAR(20) NOT NULL DEFAULT 'ALL',
    academic_session VARCHAR(50) NOT NULL DEFAULT '2025-26',
    semester VARCHAR(50) NOT NULL DEFAULT 'Semester I',
    version_label VARCHAR(100) NOT NULL,
    published_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    published_by_email VARCHAR(255) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    timetable_data JSONB NOT NULL,
    slot_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_published_timetable_scope 
    ON public.published_timetable_versions(branch_code, section, batch, is_active);

CREATE INDEX IF NOT EXISTS idx_published_timetable_published_at 
    ON public.published_timetable_versions(published_at DESC);

-- 3. Enable RLS on published_timetable_versions
ALTER TABLE public.published_timetable_versions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone authenticated can view active published timetables" ON public.published_timetable_versions;
    DROP POLICY IF EXISTS "Only admins can insert or modify published timetables" ON public.published_timetable_versions;
    DROP POLICY IF EXISTS "Service role full access on published_timetable_versions" ON public.published_timetable_versions;

    CREATE POLICY "Anyone authenticated can view active published timetables"
        ON public.published_timetable_versions FOR SELECT
        TO authenticated
        USING (is_active = true OR public.is_admin());

    CREATE POLICY "Only admins can insert or modify published timetables"
        ON public.published_timetable_versions FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());

    CREATE POLICY "Service role full access on published_timetable_versions"
        ON public.published_timetable_versions FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
END $$;
