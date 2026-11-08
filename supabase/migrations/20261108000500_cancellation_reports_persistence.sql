-- ==============================================================================
-- AttendX Cancellation Reports Persistence & Role Authorization Migration
-- Migration: 20261108000500_cancellation_reports_persistence.sql
-- Idempotent Supabase DDL with Row Level Security (RLS) & Scope Boundaries
-- ==============================================================================

-- 1. Ensure public.cancellation_reports table exists
CREATE TABLE IF NOT EXISTS public.cancellation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL,
    period_number INT,
    subject_code VARCHAR(50),
    reason_type VARCHAR(50) NOT NULL CHECK (reason_type IN ('MASS_BUNK', 'TEACHER_ABSENT', 'COLLEGE_HOLIDAY', 'OTHER')),
    description TEXT NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    reported_by_student_id UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL,
    confirmation_count INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    confirmed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Extend cancellation_reports with scope columns if not already present
ALTER TABLE public.cancellation_reports
    ADD COLUMN IF NOT EXISTS branch_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS section VARCHAR(50),
    ADD COLUMN IF NOT EXISTS batch VARCHAR(20) DEFAULT 'ALL',
    ADD COLUMN IF NOT EXISTS student_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Indexes for high-speed scope lookups and temporal ordering
CREATE INDEX IF NOT EXISTS idx_cancellation_reports_scope
    ON public.cancellation_reports (branch_code, section, status);

CREATE INDEX IF NOT EXISTS idx_cancellation_reports_date
    ON public.cancellation_reports (session_date DESC);

CREATE INDEX IF NOT EXISTS idx_cancellation_reports_section_id
    ON public.cancellation_reports (section_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_reports_created_at
    ON public.cancellation_reports (created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.cancellation_reports ENABLE ROW LEVEL SECURITY;

-- 5. Drop legacy and obsolete policies
DROP POLICY IF EXISTS "Students and admins view section cancellation reports" ON public.cancellation_reports;
DROP POLICY IF EXISTS "Students insert reports for own section" ON public.cancellation_reports;
DROP POLICY IF EXISTS "Only admins update cancellation reports" ON public.cancellation_reports;
DROP POLICY IF EXISTS "Only admins delete cancellation reports" ON public.cancellation_reports;
DROP POLICY IF EXISTS "cancellation_reports_select_policy" ON public.cancellation_reports;
DROP POLICY IF EXISTS "cancellation_reports_insert_policy" ON public.cancellation_reports;
DROP POLICY IF EXISTS "cancellation_reports_update_policy" ON public.cancellation_reports;
DROP POLICY IF EXISTS "cancellation_reports_delete_policy" ON public.cancellation_reports;
DROP POLICY IF EXISTS "cancellation_reports_service_role_policy" ON public.cancellation_reports;

-- 6. Define Hardened Role-Based RLS Policies

-- 6.1 SELECT: Visible to Admins (all), Class Admins (own class), and Students (own class)
CREATE POLICY "cancellation_reports_select_policy"
    ON public.cancellation_reports FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR
        (
            public.get_auth_role() = 'class_admin' AND
            (branch_code IS NULL OR branch_code = 'ALL' OR branch_code = public.get_auth_branch_code()) AND
            (section IS NULL OR section = 'ALL' OR section = public.get_auth_section())
        ) OR
        (
            public.get_auth_role() = 'student' AND
            (branch_code IS NULL OR branch_code = 'ALL' OR branch_code = public.get_auth_branch_code()) AND
            (section IS NULL OR section = 'ALL' OR section = public.get_auth_section())
        )
    );

-- 6.2 INSERT: Only Admins (any class) and Class Admins (assigned class). Students strictly rejected.
CREATE POLICY "cancellation_reports_insert_policy"
    ON public.cancellation_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR
        (
            public.get_auth_role() = 'class_admin' AND
            (branch_code = public.get_auth_branch_code()) AND
            (section = public.get_auth_section() OR section = 'ALL')
        )
    );

-- 6.3 UPDATE: Only Admins (any class) and Class Admins (assigned class) to confirm reports. Students strictly rejected.
CREATE POLICY "cancellation_reports_update_policy"
    ON public.cancellation_reports FOR UPDATE
    TO authenticated
    USING (
        public.is_admin() OR
        (
            public.get_auth_role() = 'class_admin' AND
            (branch_code = public.get_auth_branch_code()) AND
            (section = public.get_auth_section() OR section = 'ALL')
        )
    )
    WITH CHECK (
        public.is_admin() OR
        (
            public.get_auth_role() = 'class_admin' AND
            (branch_code = public.get_auth_branch_code()) AND
            (section = public.get_auth_section() OR section = 'ALL')
        )
    );

-- 6.4 DELETE: Only Admins may delete cancellation reports.
CREATE POLICY "cancellation_reports_delete_policy"
    ON public.cancellation_reports FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 6.5 SERVICE ROLE: Full access for server-side trusted operations
CREATE POLICY "cancellation_reports_service_role_policy"
    ON public.cancellation_reports FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
