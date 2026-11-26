-- ==============================================================================
-- AttendX Timetable Date Overrides & One-Time Classes Migration
-- Migration: 20261127000100_timetable_date_overrides.sql
-- Idempotent Supabase DDL with Row Level Security (RLS) & Scope Boundaries
-- ==============================================================================

-- 1. Create timetable_date_overrides table
CREATE TABLE IF NOT EXISTS public.timetable_date_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    override_scope VARCHAR(20) NOT NULL CHECK (override_scope IN ('PERSONAL', 'CLASS')),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    branch_code VARCHAR(50),
    section VARCHAR(50),
    batch VARCHAR(20) NOT NULL DEFAULT 'ALL',
    academic_year VARCHAR(50) NOT NULL DEFAULT '1st Year',
    override_date DATE NOT NULL,
    override_type VARCHAR(50) NOT NULL CHECK (override_type IN ('EXTRA_CLASS', 'CANCEL_OCCURRENCE', 'RESCHEDULE_OCCURRENCE')),
    slot_data JSONB,
    original_slot_id VARCHAR(100),
    original_period INT,
    original_subject_code VARCHAR(50),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_by_role VARCHAR(50) DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for high-performance date lookups and scope filtering
CREATE INDEX IF NOT EXISTS idx_overrides_class_date 
    ON public.timetable_date_overrides(branch_code, section, academic_year, override_date);

CREATE INDEX IF NOT EXISTS idx_overrides_student_date 
    ON public.timetable_date_overrides(student_id, override_date);

CREATE INDEX IF NOT EXISTS idx_overrides_batch_date 
    ON public.timetable_date_overrides(override_date, batch);

-- 3. Non-breaking extensions to attendance_records for extra classes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records' AND table_schema = 'public') THEN
        ALTER TABLE public.attendance_records
            ADD COLUMN IF NOT EXISTS is_extra_class BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS occurrence_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS slot_id VARCHAR(100);

        CREATE INDEX IF NOT EXISTS idx_attendance_records_occurrence
            ON public.attendance_records(occurrence_id);
    END IF;
END $$;

-- 4. Enable Row Level Security
ALTER TABLE public.timetable_date_overrides ENABLE ROW LEVEL SECURITY;

-- 5. Drop legacy policies if any
DROP POLICY IF EXISTS "overrides_select_policy" ON public.timetable_date_overrides;
DROP POLICY IF EXISTS "overrides_insert_policy" ON public.timetable_date_overrides;
DROP POLICY IF EXISTS "overrides_update_policy" ON public.timetable_date_overrides;
DROP POLICY IF EXISTS "overrides_delete_policy" ON public.timetable_date_overrides;

-- 6. RLS Policies

-- 6.1 SELECT:
-- Admins view all.
-- Students view their own PERSONAL overrides OR CLASS overrides matching their branch & section.
-- Class Admins view their managed class overrides and their personal overrides.
CREATE POLICY "overrides_select_policy"
    ON public.timetable_date_overrides FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR
        (
            override_scope = 'PERSONAL' AND student_id = auth.uid()
        ) OR
        (
            override_scope = 'CLASS' AND
            (branch_code IS NULL OR branch_code = 'ALL' OR branch_code = public.get_auth_branch_code()) AND
            (section IS NULL OR section = 'ALL' OR section = public.get_auth_section())
        )
    );

-- 6.2 INSERT:
-- Admins can insert any.
-- Class Admins can insert CLASS scope for their assigned branch and section, or PERSONAL for themselves.
-- Students can insert PERSONAL scope where student_id = auth.uid().
CREATE POLICY "overrides_insert_policy"
    ON public.timetable_date_overrides FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR
        (
            override_scope = 'PERSONAL' AND student_id = auth.uid()
        ) OR
        (
            public.get_auth_role() = 'class_admin' AND
            override_scope = 'CLASS' AND
            branch_code = public.get_auth_branch_code() AND
            (section = public.get_auth_section() OR section = 'ALL')
        )
    );

-- 6.3 UPDATE:
CREATE POLICY "overrides_update_policy"
    ON public.timetable_date_overrides FOR UPDATE
    TO authenticated
    USING (
        public.is_admin() OR
        (
            override_scope = 'PERSONAL' AND student_id = auth.uid()
        ) OR
        (
            public.get_auth_role() = 'class_admin' AND
            override_scope = 'CLASS' AND
            branch_code = public.get_auth_branch_code() AND
            (section = public.get_auth_section() OR section = 'ALL')
        )
    );

-- 6.4 DELETE:
CREATE POLICY "overrides_delete_policy"
    ON public.timetable_date_overrides FOR DELETE
    TO authenticated
    USING (
        public.is_admin() OR
        (
            override_scope = 'PERSONAL' AND student_id = auth.uid()
        ) OR
        (
            public.get_auth_role() = 'class_admin' AND
            override_scope = 'CLASS' AND
            branch_code = public.get_auth_branch_code() AND
            (section = public.get_auth_section() OR section = 'ALL')
        )
    );
