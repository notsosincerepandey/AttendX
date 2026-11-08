-- ==============================================================================
-- AttendX Cancellation Confirmations Atomic Tracking Migration
-- Migration: 20261108000600_cancellation_confirmations_atomic.sql
-- Provides:
-- 1. Table public.cancellation_report_confirmations tracking user confirmations.
-- 2. Unique constraint preventing duplicate confirmations by the same user.
-- 3. Row-level security for confirmations.
-- 4. Atomic PostgreSQL stored procedure public.confirm_cancellation_report_atomic()
--    with row-level locking (FOR UPDATE) and atomic increment.
-- ==============================================================================

-- 1. Create cancellation_report_confirmations table
CREATE TABLE IF NOT EXISTS public.cancellation_report_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.cancellation_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_cancellation_report_user_confirmation UNIQUE (report_id, user_id)
);

-- 2. Indexes for fast lookups and join performance
CREATE INDEX IF NOT EXISTS idx_cancellation_confirmations_report_id 
    ON public.cancellation_report_confirmations (report_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_confirmations_user_id 
    ON public.cancellation_report_confirmations (user_id);

-- 3. Enable RLS
ALTER TABLE public.cancellation_report_confirmations ENABLE ROW LEVEL SECURITY;

-- 4. Drop legacy policies if any
DROP POLICY IF EXISTS "cancellation_confirmations_select_policy" ON public.cancellation_report_confirmations;
DROP POLICY IF EXISTS "cancellation_confirmations_insert_policy" ON public.cancellation_report_confirmations;
DROP POLICY IF EXISTS "cancellation_confirmations_delete_policy" ON public.cancellation_report_confirmations;
DROP POLICY IF EXISTS "cancellation_confirmations_service_role" ON public.cancellation_report_confirmations;

-- 5. Define RLS Policies
-- SELECT: Authenticated users can see confirmation records for reports they are allowed to see
CREATE POLICY "cancellation_confirmations_select_policy"
    ON public.cancellation_report_confirmations FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.cancellation_reports cr
            WHERE cr.id = cancellation_report_confirmations.report_id
            AND (
                cr.branch_code IS NULL OR cr.branch_code = 'ALL' OR cr.branch_code = public.get_auth_branch_code()
            )
            AND (
                cr.section IS NULL OR cr.section = 'ALL' OR cr.section = public.get_auth_section()
            )
        )
    );

-- INSERT: Only Admin and authorized Class Admin
CREATE POLICY "cancellation_confirmations_insert_policy"
    ON public.cancellation_report_confirmations FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = user_id) AND
        (
            public.is_admin() OR
            (
                public.get_auth_role() = 'class_admin' AND
                EXISTS (
                    SELECT 1 FROM public.cancellation_reports cr
                    WHERE cr.id = report_id
                    AND (cr.branch_code = public.get_auth_branch_code())
                    AND (cr.section = public.get_auth_section() OR cr.section = 'ALL')
                )
            )
        )
    );

-- DELETE: Only Admins can delete confirmations
CREATE POLICY "cancellation_confirmations_delete_policy"
    ON public.cancellation_report_confirmations FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ALL: Service role
CREATE POLICY "cancellation_confirmations_service_role"
    ON public.cancellation_report_confirmations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Atomic Confirmation Function with FOR UPDATE Lock & Duplicate Rejection
CREATE OR REPLACE FUNCTION public.confirm_cancellation_report_atomic(
    p_report_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_report public.cancellation_reports%ROWTYPE;
    v_count INT;
BEGIN
    -- 1. Fetch target report with row-level exclusive lock
    SELECT * INTO v_report
    FROM public.cancellation_reports
    WHERE id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cancellation report not found.',
            'statusCode', 404
        );
    END IF;

    -- 2. Scope verification
    IF NOT public.is_admin() THEN
        IF public.get_auth_role() != 'class_admin' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Access Denied: Only Administrators and Class Admins may confirm reports.',
                'statusCode', 403
            );
        END IF;

        IF v_report.branch_code IS NOT NULL AND v_report.branch_code != 'ALL' AND v_report.branch_code != public.get_auth_branch_code() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Access Denied: You cannot confirm reports for other branches.',
                'statusCode', 403
            );
        END IF;

        IF v_report.section IS NOT NULL AND v_report.section != 'ALL' AND v_report.section != public.get_auth_section() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Access Denied: You cannot confirm reports for other sections.',
                'statusCode', 403
            );
        END IF;
    END IF;

    -- 3. Duplicate confirmation check
    IF EXISTS (
        SELECT 1 FROM public.cancellation_report_confirmations
        WHERE report_id = p_report_id AND user_id = p_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already confirmed this cancellation report.',
            'statusCode', 409
        );
    END IF;

    -- 4. Record user confirmation
    INSERT INTO public.cancellation_report_confirmations (report_id, user_id)
    VALUES (p_report_id, p_user_id);

    -- 5. Atomic count aggregation
    SELECT COUNT(*)::INT INTO v_count
    FROM public.cancellation_report_confirmations
    WHERE report_id = p_report_id;

    -- 6. Update report status and atomic confirmation count
    UPDATE public.cancellation_reports
    SET status = 'CONFIRMED',
        confirmation_count = GREATEST(v_count, v_report.confirmation_count + 1),
        confirmed_by = p_user_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_report_id;

    RETURN jsonb_build_object(
        'success', true,
        'report_id', p_report_id,
        'status', 'CONFIRMED',
        'confirmation_count', GREATEST(v_count, v_report.confirmation_count + 1),
        'confirmed_by', p_user_id,
        'statusCode', 200
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already confirmed this cancellation report.',
            'statusCode', 409
        );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;
