-- ==============================================================================
-- AttendX Class Announcements Persistence & Class-Level Authorization Migration
-- Migration: 20261108_class_announcements_persistence.sql
-- Idempotent Supabase DDL with Row Level Security (RLS) & Scope Boundaries
-- ==============================================================================

-- 1. Create public.class_announcements table
CREATE TABLE IF NOT EXISTS public.class_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger', 'success')),
    branch_code TEXT NOT NULL,
    section TEXT NOT NULL,
    batch TEXT DEFAULT 'ALL',
    academic_session TEXT,
    semester TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'class_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for performance and high-speed scope lookups
CREATE INDEX IF NOT EXISTS idx_class_announcements_scope 
    ON public.class_announcements(branch_code, section, batch);

CREATE INDEX IF NOT EXISTS idx_class_announcements_created_by 
    ON public.class_announcements(created_by);

CREATE INDEX IF NOT EXISTS idx_class_announcements_created_at 
    ON public.class_announcements(created_at DESC);

-- 3. Enable Row-Level Security
ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;

-- 4. Helper function: Determine if authenticated user is the single application admin
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.user_id = check_user_id
          AND sp.role = 'admin'
    )
    OR EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = check_user_id
          AND (u.raw_app_meta_data->>'role' = 'admin' OR u.email = 'admin@mmmut.ac.in')
    );
$$;

-- 5. Helper function: Determine if user can view a specific announcement
CREATE OR REPLACE FUNCTION public.can_view_announcement(
    p_user_id UUID,
    p_branch_code TEXT,
    p_section TEXT,
    p_batch TEXT,
    p_academic_session TEXT,
    p_semester TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role TEXT;
    v_branch_code TEXT;
    v_section TEXT;
    v_batch TEXT;
    v_session TEXT;
    v_semester TEXT;
BEGIN
    -- Admin has unrestricted access
    IF public.is_admin_user(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Look up student profile
    SELECT 
        sp.role,
        COALESCE(sp.managed_branch_code, b.code, 'IT'),
        COALESCE(sp.managed_section, s.section_name, 'SEC-B'),
        COALESCE(sp.managed_batch, sp.batch, 'ALL'),
        sp.academic_session,
        sp.semester
    INTO 
        v_role,
        v_branch_code,
        v_section,
        v_batch,
        v_session,
        v_semester
    FROM public.student_profiles sp
    LEFT JOIN public.branches b ON b.id = sp.branch_id
    LEFT JOIN public.sections s ON s.id = sp.section_id
    WHERE sp.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- University-wide announcements visible to everyone
    IF p_branch_code = 'ALL' THEN
        RETURN TRUE;
    END IF;

    -- Branch must match
    IF p_branch_code <> v_branch_code THEN
        RETURN FALSE;
    END IF;

    -- Section must match or be ALL
    IF p_section <> 'ALL' AND p_section <> v_section THEN
        RETURN FALSE;
    END IF;

    -- Batch scoping: if practical batch is targeted
    IF p_batch IS NOT NULL AND p_batch <> 'ALL' AND v_batch <> 'ALL' AND p_batch <> v_batch THEN
        RETURN FALSE;
    END IF;

    -- Academic session scoping
    IF p_academic_session IS NOT NULL AND v_session IS NOT NULL AND p_academic_session <> v_session THEN
        RETURN FALSE;
    END IF;

    -- Semester scoping
    IF p_semester IS NOT NULL AND v_semester IS NOT NULL AND p_semester <> v_semester THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- 6. Helper function: Determine if user can manage (edit/delete) an announcement
CREATE OR REPLACE FUNCTION public.can_manage_announcement(
    p_user_id UUID,
    p_branch_code TEXT,
    p_section TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role TEXT;
    v_branch_code TEXT;
    v_section TEXT;
BEGIN
    -- Admin has unrestricted management rights
    IF public.is_admin_user(p_user_id) THEN
        RETURN TRUE;
    END IF;

    SELECT 
        sp.role,
        sp.managed_branch_code,
        sp.managed_section
    INTO 
        v_role,
        v_branch_code,
        v_section
    FROM public.student_profiles sp
    WHERE sp.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Only class_admin (CR) can manage class announcements
    IF v_role <> 'class_admin' THEN
        RETURN FALSE;
    END IF;

    -- CR can manage only within their authorized managed scope
    IF p_branch_code = v_branch_code AND (p_section = 'ALL' OR p_section = v_section) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 7. Helper function: Determine if user can create an announcement for target scope
CREATE OR REPLACE FUNCTION public.can_create_announcement(
    p_user_id UUID,
    p_branch_code TEXT,
    p_section TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role TEXT;
    v_branch_code TEXT;
    v_section TEXT;
BEGIN
    -- Admin can create announcements for any class or university-wide
    IF public.is_admin_user(p_user_id) THEN
        RETURN TRUE;
    END IF;

    SELECT 
        sp.role,
        sp.managed_branch_code,
        sp.managed_section
    INTO 
        v_role,
        v_branch_code,
        v_section
    FROM public.student_profiles sp
    WHERE sp.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Students cannot create announcements
    IF v_role <> 'class_admin' THEN
        RETURN FALSE;
    END IF;

    -- CR cannot create university-wide announcements
    IF p_branch_code = 'ALL' OR p_section = 'ALL' THEN
        RETURN FALSE;
    END IF;

    -- CR can create only for their authorized managed class
    IF p_branch_code = v_branch_code AND p_section = v_section THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 8. Apply Row Level Security Policies
DO $$
BEGIN
    -- Drop existing policies if any to ensure idempotency
    DROP POLICY IF EXISTS "announcements_view_policy" ON public.class_announcements;
    DROP POLICY IF EXISTS "announcements_create_policy" ON public.class_announcements;
    DROP POLICY IF EXISTS "announcements_update_policy" ON public.class_announcements;
    DROP POLICY IF EXISTS "announcements_delete_policy" ON public.class_announcements;
    DROP POLICY IF EXISTS "announcements_service_role_policy" ON public.class_announcements;

    -- SELECT policy: Users can read announcements scoped to their class or ALL
    CREATE POLICY "announcements_view_policy" ON public.class_announcements
        FOR SELECT
        TO authenticated
        USING (
            public.can_view_announcement(
                auth.uid(),
                branch_code,
                section,
                batch,
                academic_session,
                semester
            )
        );

    -- INSERT policy: Admins and CRs within their managed scope
    CREATE POLICY "announcements_create_policy" ON public.class_announcements
        FOR INSERT
        TO authenticated
        WITH CHECK (
            public.can_create_announcement(
                auth.uid(),
                branch_code,
                section
            )
        );

    -- UPDATE policy: Admins and CRs within their managed scope
    CREATE POLICY "announcements_update_policy" ON public.class_announcements
        FOR UPDATE
        TO authenticated
        USING (
            public.can_manage_announcement(
                auth.uid(),
                branch_code,
                section
            )
        )
        WITH CHECK (
            public.can_manage_announcement(
                auth.uid(),
                branch_code,
                section
            )
        );

    -- DELETE policy: Admins and CRs within their managed scope
    CREATE POLICY "announcements_delete_policy" ON public.class_announcements
        FOR DELETE
        TO authenticated
        USING (
            public.can_manage_announcement(
                auth.uid(),
                branch_code,
                section
            )
        );

    -- Full service_role bypass for backend maintenance
    CREATE POLICY "announcements_service_role_policy" ON public.class_announcements
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
END $$;
