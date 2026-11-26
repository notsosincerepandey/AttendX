-- ==============================================================================
-- AttendX Academic Year Management & Multi-Year Scale Upgrade
-- Migration: 20261126000100_academic_year_and_management_upgrade.sql
-- Idempotent Supabase DDL for Multi-Year Support, Archival & Student Life-Cycle
-- ==============================================================================

BEGIN;

-- 1. Ensure student_profiles has academic_year column and proper status indexes
ALTER TABLE public.student_profiles 
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT '1st Year';

-- Set default for existing first-year cohort without altering any existing identity
UPDATE public.student_profiles 
SET academic_year = '1st Year' 
WHERE academic_year IS NULL OR academic_year = '';

CREATE INDEX IF NOT EXISTS idx_student_profiles_academic_year 
  ON public.student_profiles(academic_year);

CREATE INDEX IF NOT EXISTS idx_student_profiles_status 
  ON public.student_profiles(status, is_active);

CREATE INDEX IF NOT EXISTS idx_student_profiles_year_branch_sec
  ON public.student_profiles(academic_year, branch_code, section, batch);

-- 2. Enhance published_timetable_versions with academic_year and lifecycle status
ALTER TABLE public.published_timetable_versions 
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT '1st Year',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

UPDATE public.published_timetable_versions
SET academic_year = '1st Year'
WHERE academic_year IS NULL OR academic_year = '';

UPDATE public.published_timetable_versions
SET status = CASE WHEN is_active = true THEN 'active' ELSE 'archived' END
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_published_timetable_year_sem 
  ON public.published_timetable_versions(academic_year, semester, branch_code, section);

CREATE INDEX IF NOT EXISTS idx_published_timetable_status
  ON public.published_timetable_versions(status, is_active);

-- 3. Reference Data Seeding: Academic Sessions for 1st through 4th Year for MMMUT
INSERT INTO public.academic_sessions (university_id, session_name, year_name, semester_name, is_active)
SELECT u.id, s.session_name, s.year_name, s.semester_name, TRUE
FROM public.universities u
CROSS JOIN (VALUES
    ('2026-27', '1st Year', 'Semester I'),
    ('2026-27', '1st Year', 'Semester II'),
    ('2026-27', '2nd Year', 'Semester III'),
    ('2026-27', '2nd Year', 'Semester IV'),
    ('2026-27', '3rd Year', 'Semester V'),
    ('2026-27', '3rd Year', 'Semester VI'),
    ('2026-27', '4th Year', 'Semester VII'),
    ('2026-27', '4th Year', 'Semester VIII')
) AS s(session_name, year_name, semester_name)
WHERE u.short_name = 'MMMUT'
  AND NOT EXISTS (
      SELECT 1 FROM public.academic_sessions a
      WHERE a.university_id = u.id
        AND a.session_name = s.session_name
        AND a.year_name = s.year_name
        AND a.semester_name = s.semester_name
  );

COMMIT;
