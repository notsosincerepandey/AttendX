-- ==============================================================================
-- AttendX Bulk Student Onboarding & Password Security — HARDENED FINAL
-- Migration: 20261108_bulk_student_onboarding.sql
--
-- Security architecture in this revision:
--   A. Admin reset ticket: trigger reads ticket from NEW.raw_app_meta_data
--      only as an ephemeral KEY to look up in admin_password_resets. The table
--      record is the authoritative authorization gate — a ticket pointer in
--      metadata cannot be forged by a student because GoTrue blocks student writes
--      to app_metadata entirely, and an unconsumed/unexpired database ticket
--      inserted by the server-side service-role is mandatory.
--   B. Table-based authorization: GUCs (set_config/current_setting) are NOT
--      used because ordinary roles can set custom GUCs. Instead, authorization
--      uses a private table public.password_sync_authorizations.
--      Only enforce_one_time_password_change() (SECURITY DEFINER) inserts
--      authorization records containing (pg_current_xact_id()::text, user_id, 'PASSWORD_SYNC').
--      protect_student_onboarding_identity() atomically verifies and consumes
--      (DELETE) the record. Direct updates fail unconditionally.
--   C. Database role clarity: In Supabase, GoTrue connects directly as
--      supabase_auth_admin (for both student self-service and admin updates).
--      PostgREST connects as authenticator and switches via SET LOCAL ROLE.
--      Authentication relies strictly on cryptographic ticket validation and
--      atomic authorization table consumption, not session_user heuristics.
--   D. Function ownership & privileges: Both functions owned by postgres
--      (SECURITY DEFINER). Table privileges on admin_password_resets and
--      password_sync_authorizations are revoked from PUBLIC, anon, authenticated.
--      enforce_one_time_password_change() EXECUTE revoked from all user roles.
-- ==============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Reference Data Seeding (Universities, Sessions, Branches, Sections)
-- ============================================================================

-- 1.1 Ensure public.universities contains MMMUT
INSERT INTO public.universities (id, name, short_name, location)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.universities 
            WHERE id = '00000000-0000-0000-0000-000000000001'::uuid 
              AND short_name <> 'MMMUT'
        )
        THEN gen_random_uuid()
        ELSE '00000000-0000-0000-0000-000000000001'::uuid
    END,
    'Madan Mohan Malaviya University of Technology, Gorakhpur',
    'MMMUT',
    'Gorakhpur, Uttar Pradesh, India'
WHERE NOT EXISTS (
    SELECT 1 FROM public.universities WHERE short_name = 'MMMUT'
);

-- 1.2 Ensure academic_sessions contains Session 2026-27 scoped exclusively to MMMUT
INSERT INTO public.academic_sessions (id, university_id, session_name, year_name, semester_name, is_active)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.academic_sessions 
            WHERE id = '00000000-0000-0000-0000-000000000002'::uuid
        )
        THEN gen_random_uuid()
        ELSE '00000000-0000-0000-0000-000000000002'::uuid
    END,
    u.id,
    '2026-27',
    'First Year',
    'Semester I',
    TRUE
FROM public.universities u
WHERE u.short_name = 'MMMUT'
  AND NOT EXISTS (
      SELECT 1 FROM public.academic_sessions s
      WHERE s.session_name = '2026-27'
        AND s.university_id = u.id   -- scoped to MMMUT, not global
  );

-- 1.3 Ensure branches contains all 8 official B.Tech engineering branches for MMMUT
INSERT INTO public.branches (university_id, name, code, degree)
SELECT u.id, b.name, b.code, 'B.Tech'
FROM public.universities u
CROSS JOIN (VALUES
    ('Civil Engineering',                      'CE'),
    ('Computer Science & Engineering',         'CSE'),
    ('Electrical Engineering',                 'EE'),
    ('Electronics & Communication Engineering','ECE'),
    ('ECE (Internet of Things)',               'ECE(IOT)'),
    ('Mechanical Engineering',                 'ME'),
    ('Chemical Engineering',                   'CHE'),
    ('Information Technology',                 'IT')
) AS b(name, code)
WHERE u.short_name = 'MMMUT'
  AND NOT EXISTS (
      SELECT 1 FROM public.branches br
      WHERE br.code = b.code AND br.university_id = u.id
  );

-- 1.4 Ensure sections contains all 17 configured class sections for MMMUT branches
INSERT INTO public.sections (branch_id, section_name)
SELECT b.id, s.section_name
FROM public.branches b
JOIN public.universities u ON u.id = b.university_id AND u.short_name = 'MMMUT'
JOIN (VALUES
    ('CE',      'SEC-A'), ('CE',      'SEC-B'),
    ('CSE',     'SEC-A'), ('CSE',     'SEC-B'), ('CSE', 'SEC-C'), ('CSE', 'SEC-D'),
    ('EE',      'SEC-A'), ('EE',      'SEC-B'),
    ('ECE',     'SEC-A'), ('ECE',     'SEC-B'), ('ECE', 'SEC-C'),
    ('ECE(IOT)','SEC-A'),
    ('ME',      'SEC-A'), ('ME',      'SEC-B'),
    ('CHE',     'SEC-A'),
    ('IT',      'SEC-A'), ('IT',      'SEC-B')
) AS s(branch_code, section_name) ON s.branch_code = b.code
WHERE NOT EXISTS (
    SELECT 1 FROM public.sections sec
    WHERE sec.branch_id = b.id AND sec.section_name = s.section_name
);

-- ============================================================================
-- SECTION 2: student_profiles Schema Extension
-- ============================================================================

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS roll_number          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS enrollment_number    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS father_name          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS branch_code          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS section              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS password_change_consumed
                                                BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_password_change
                                                BOOLEAN NOT NULL DEFAULT TRUE;

-- Partial unique indexes (NULL-safe; allow admin/legacy profiles without roll numbers)
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_roll_number
  ON public.student_profiles(roll_number)
  WHERE roll_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_profiles_enrollment_number
  ON public.student_profiles(enrollment_number)
  WHERE enrollment_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_profiles_branch_section
  ON public.student_profiles(branch_code, section, batch);

-- ============================================================================
-- SECTION 3: admin_password_resets Table
--
-- Stores short-lived (5 min), single-use cryptographic ticket hashes generated
-- exclusively by the server-side service-role path when the Administrator resets
-- a student password.  The trigger ONLY consults this table — the ticket pointer
-- in raw_app_meta_data is advisory, not authoritative.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_password_resets (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_hash  TEXT        NOT NULL,
    action       VARCHAR(50) NOT NULL DEFAULT 'RESET',
    consumed     BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_password_resets
    ADD COLUMN IF NOT EXISTS action VARCHAR(50) NOT NULL DEFAULT 'RESET';

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_lookup
    ON public.admin_password_resets(user_id, ticket_hash, action, consumed, expires_at);

ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;

-- Strip all default privileges (PUBLIC role carries them by default in Postgres)
REVOKE ALL ON TABLE public.admin_password_resets FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_password_resets FROM anon;
REVOKE ALL ON TABLE public.admin_password_resets FROM authenticated;

-- Service role (application server) needs full access to INSERT tickets and SELECT them
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_password_resets TO service_role;
-- postgres (superuser / function owner) needs SELECT+UPDATE to consume tickets inside SECURITY DEFINER trigger
GRANT SELECT, UPDATE ON TABLE public.admin_password_resets TO postgres;

-- RLS policy: Only service_role may read or write rows directly
DROP POLICY IF EXISTS "Service role full access on admin_password_resets" ON public.admin_password_resets;
CREATE POLICY "Service role full access on admin_password_resets"
    ON public.admin_password_resets FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- SECTION 4: password_sync_authorizations Table
--
-- Stores transaction-bound authorization records inserted EXCLUSIVELY by
-- enforce_one_time_password_change() within its SECURITY DEFINER execution.
-- protect_student_onboarding_identity() atomically verifies and consumes (deletes)
-- the matching record.
--
-- Does NOT rely on custom GUCs (set_config/current_setting), which can be set
-- by ordinary users. All privileges are REVOKED from PUBLIC, anon, and authenticated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_sync_authorizations (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    txid         TEXT         NOT NULL,
    user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation    VARCHAR(50)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_password_sync_auth_txid_user_op
    ON public.password_sync_authorizations(txid, user_id, operation);

ALTER TABLE public.password_sync_authorizations ENABLE ROW LEVEL SECURITY;

-- Strip all default privileges from user-facing roles
REVOKE ALL ON TABLE public.password_sync_authorizations FROM PUBLIC;
REVOKE ALL ON TABLE public.password_sync_authorizations FROM anon;
REVOKE ALL ON TABLE public.password_sync_authorizations FROM authenticated;

-- Only postgres and service_role can access this internal table
GRANT SELECT, INSERT, DELETE ON TABLE public.password_sync_authorizations TO postgres;
GRANT SELECT, INSERT, DELETE ON TABLE public.password_sync_authorizations TO service_role;

DROP POLICY IF EXISTS "Service role full access on password_sync_authorizations" ON public.password_sync_authorizations;
CREATE POLICY "Service role full access on password_sync_authorizations"
    ON public.password_sync_authorizations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- SECTION 4B: admin_reset_rate_limits Table & Concurrency-Safe Atomic Limiter
--
-- Provides atomic, distributed rate limiting for Admin password resets.
-- Shared across all application server instances and serverless executions.
-- Concurrency safety enforced via a transaction-scoped advisory lock keyed
-- to the specific administrator ID (no crosstalk between administrators).
-- Enforces a strict sliding-window policy (max 30 resets per 60 seconds).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_reset_rate_limits (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_reset_rate_limits_lookup
    ON public.admin_reset_rate_limits (admin_id, created_at DESC);

ALTER TABLE public.admin_reset_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_reset_rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_reset_rate_limits FROM anon;
REVOKE ALL ON TABLE public.admin_reset_rate_limits FROM authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.admin_reset_rate_limits TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.admin_reset_rate_limits TO postgres;

DROP POLICY IF EXISTS "Service role full access on admin_reset_rate_limits" ON public.admin_reset_rate_limits;
CREATE POLICY "Service role full access on admin_reset_rate_limits"
    ON public.admin_reset_rate_limits FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_and_record_reset_rate_limit(
    p_admin_id TEXT,
    p_max_attempts INT DEFAULT 30,
    p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_key     BIGINT;
    v_recent_count INT;
    v_cutoff       TIMESTAMPTZ;
    v_now          TIMESTAMPTZ;
BEGIN
    -- Input Validation
    IF p_admin_id IS NULL OR trim(p_admin_id) = '' THEN
        RAISE EXCEPTION 'p_admin_id cannot be null or empty';
    END IF;
    IF p_max_attempts IS NULL OR p_max_attempts <= 0 THEN
        RAISE EXCEPTION 'p_max_attempts must be a positive integer';
    END IF;
    IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
        RAISE EXCEPTION 'p_window_seconds must be a positive integer';
    END IF;

    -- Derive deterministic 64-bit advisory lock key keyed exclusively to p_admin_id
    -- md5 substring (16 hex chars = 64 bits) cast to signed 64-bit bigint
    v_lock_key := ('x' || substr(md5('attendx:admin_rate_limit:' || trim(p_admin_id)), 1, 16))::bit(64)::bigint;

    -- Concurrency Serialization: Acquire transaction-scoped exclusive advisory lock.
    -- Serializes concurrent calls for the same admin, while different admins hash to different keys.
    -- Automatically released when the transaction ends (commit or rollback).
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Clock timestamp at lock acquisition (represents execution time after lock acquisition, not transaction start time)
    v_now := clock_timestamp();
    v_cutoff := v_now - (p_window_seconds || ' seconds')::interval;

    -- Auto-prune stale entries older than window + 5 minutes
    DELETE FROM public.admin_reset_rate_limits
    WHERE created_at < (v_cutoff - interval '5 minutes');

    -- Count reset attempts by this admin within the current sliding window
    SELECT COUNT(*) INTO v_recent_count
    FROM public.admin_reset_rate_limits
    WHERE admin_id = p_admin_id
      AND created_at >= v_cutoff;

    IF v_recent_count >= p_max_attempts THEN
        RETURN FALSE; -- Rate limited
    END IF;

    -- Record current attempt atomically using wall-clock time
    INSERT INTO public.admin_reset_rate_limits (admin_id, created_at)
    VALUES (p_admin_id, v_now);

    RETURN TRUE; -- Within limit
END;
$$;

ALTER FUNCTION public.check_and_record_reset_rate_limit(TEXT, INT, INT) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.check_and_record_reset_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_record_reset_rate_limit(TEXT, INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_record_reset_rate_limit(TEXT, INT, INT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.check_and_record_reset_rate_limit(TEXT, INT, INT) TO service_role, postgres;

-- ============================================================================
-- SECTION 5: enforce_one_time_password_change() — auth.users BEFORE UPDATE trigger
--
-- Authorization model:
--   Student self-service (no ticket):
--     - Only permitted when password_change_consumed = false in OLD.raw_app_meta_data
--     - Sets password_change_consumed = true, requires_password_change = false
--     - On second attempt: RAISES exception
--   Admin reset (ticket present in NEW.raw_app_meta_data):
--     - Ticket hash is looked up in admin_password_resets. The DB record is the
--       sole authority — the in-metadata pointer is a lookup key only.
--     - Ticket must be unconsumed, unexpired, and match user_id.
--     - On match: ticket is consumed atomically, flags reset for next mandatory change.
--     - On mismatch: RAISES exception regardless of metadata contents.
--
--   Inserts a transaction-bound record into public.password_sync_authorizations
--   before updating public.student_profiles, allowing protect_student_onboarding_identity()
--   to atomically verify and consume the authorization in the same transaction.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_one_time_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_ticket_hash    TEXT;
    v_recovery_ticket TEXT;
    v_ticket_found   BOOLEAN := FALSE;
    v_new_meta       JSONB;
    v_old_meta       JSONB;
BEGIN
    -- Only act on password mutations; protect security metadata from client tampering
    IF NEW.encrypted_password IS NOT DISTINCT FROM OLD.encrypted_password THEN
        IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
            IF (COALESCE(NEW.raw_app_meta_data->>'account_status', '')            IS DISTINCT FROM COALESCE(OLD.raw_app_meta_data->>'account_status', '') OR
                COALESCE(NEW.raw_app_meta_data->>'requires_password_change', '')  IS DISTINCT FROM COALESCE(OLD.raw_app_meta_data->>'requires_password_change', '') OR
                COALESCE(NEW.raw_app_meta_data->>'password_change_consumed', '')  IS DISTINCT FROM COALESCE(OLD.raw_app_meta_data->>'password_change_consumed', '') OR
                COALESCE(NEW.raw_app_meta_data->>'admin_reset_ticket', '')        IS DISTINCT FROM COALESCE(OLD.raw_app_meta_data->>'admin_reset_ticket', '') OR
                COALESCE(NEW.raw_app_meta_data->>'admin_recovery_ticket', '')     IS DISTINCT FROM COALESCE(OLD.raw_app_meta_data->>'admin_recovery_ticket', ''))
            THEN
                RAISE EXCEPTION 'Access Denied: Security app_metadata fields are immutable to authenticated users.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    v_new_meta := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
    v_old_meta := COALESCE(OLD.raw_app_meta_data, '{}'::jsonb);
    v_ticket_hash := trim(COALESCE(v_new_meta->>'admin_reset_ticket', ''));
    v_recovery_ticket := trim(COALESCE(v_new_meta->>'admin_recovery_ticket', ''));

    -- -------------------------------------------------------------------------
    -- PATH R: Admin Recovery Lock — ticket present with action = 'RECOVERY_LOCK'
    -- -------------------------------------------------------------------------
    IF v_recovery_ticket <> '' THEN
        UPDATE public.admin_password_resets
        SET    consumed = TRUE
        WHERE  user_id     = NEW.id
          AND  ticket_hash = v_recovery_ticket
          AND  action      = 'RECOVERY_LOCK'
          AND  consumed    = FALSE
          AND  expires_at  > now()
        RETURNING TRUE INTO v_ticket_found;

        IF NOT COALESCE(v_ticket_found, FALSE) THEN
            RAISE EXCEPTION
                'Access Denied: Admin recovery ticket is invalid, expired, or already consumed. '
                'The database ticket record is the sole authority.';
        END IF;

        -- Strictly enforce locked state: flags MUST require password change and NOT be consumed
        v_new_meta := jsonb_set(v_new_meta, '{password_change_consumed}', 'false'::jsonb, TRUE);
        v_new_meta := jsonb_set(v_new_meta, '{requires_password_change}', 'true'::jsonb,  TRUE);
        v_new_meta := jsonb_set(v_new_meta, '{account_status}', '"RECOVERY_LOCKED"'::jsonb, TRUE);
        v_new_meta := v_new_meta - 'admin_recovery_ticket' - 'admin_reset_ticket';
        NEW.raw_app_meta_data := v_new_meta;

        -- Authorize student_profiles update if profile row exists
        -- tr_protect_student_onboarding_identity is the SOLE consumer.
        INSERT INTO public.password_sync_authorizations (txid, user_id, operation)
        VALUES (pg_current_xact_id()::text, NEW.id, 'RECOVERY_LOCK');

        UPDATE public.student_profiles
        SET    password_change_consumed = FALSE,
               requires_password_change = TRUE,
               status                   = 'LOCKED'
        WHERE  user_id = NEW.id;

    -- -------------------------------------------------------------------------
    -- PATH A: Admin reset — ticket present in app_metadata
    -- -------------------------------------------------------------------------
    ELSIF v_ticket_hash <> '' THEN

        -- The ticket hash is a lookup key into admin_password_resets.
        -- That table is the authoritative source — matching a valid row is the proof.
        UPDATE public.admin_password_resets
        SET    consumed = TRUE
        WHERE  user_id     = NEW.id
          AND  ticket_hash = v_ticket_hash
          AND  action      = 'RESET'
          AND  consumed    = FALSE
          AND  expires_at  > now()
        RETURNING TRUE INTO v_ticket_found;

        IF NOT COALESCE(v_ticket_found, FALSE) THEN
            RAISE EXCEPTION
                'Access Denied: Admin reset ticket is invalid, expired, or already consumed. '
                'The database ticket record is the sole authority — metadata alone is insufficient.';
        END IF;

        -- Ticket authenticated. Strip it and reset state so student must change password.
        v_new_meta := jsonb_set(v_new_meta, '{password_change_consumed}', 'false'::jsonb, TRUE);
        v_new_meta := jsonb_set(v_new_meta, '{requires_password_change}', 'true'::jsonb,  TRUE);
        v_new_meta := jsonb_set(v_new_meta, '{account_status}', '"ACTIVE"'::jsonb, TRUE);
        v_new_meta := v_new_meta - 'admin_reset_ticket' - 'admin_recovery_ticket';
        NEW.raw_app_meta_data := v_new_meta;

        -- Insert protected transaction authorization for student_profiles trigger
        -- tr_protect_student_onboarding_identity is the SOLE consumer.
        INSERT INTO public.password_sync_authorizations (txid, user_id, operation)
        VALUES (pg_current_xact_id()::text, NEW.id, 'PASSWORD_SYNC');

        UPDATE public.student_profiles
        SET    password_change_consumed  = FALSE,
               requires_password_change  = TRUE,
               status                    = 'ACTIVE'
        WHERE  user_id = NEW.id;

    -- -------------------------------------------------------------------------
    -- PATH B: Self-service password change — no ticket
    -- -------------------------------------------------------------------------
    ELSIF v_old_meta->>'role' = 'student' THEN

        -- Locked accounts are strictly barred from self-service password changes
        IF v_old_meta->>'account_status' = 'RECOVERY_LOCKED' THEN
            RAISE EXCEPTION
                'Access Denied: Account is locked pending administrative review. Self-service password changes are disabled.';
        END IF;

        IF COALESCE((v_old_meta->>'password_change_consumed')::boolean, FALSE) = TRUE THEN
            RAISE EXCEPTION
                'Access Denied: You have already consumed your one permitted self-service '
                'password change. Subsequent resets must be performed by an Administrator.';
        END IF;

        -- First change: mark consumed
        v_new_meta := jsonb_set(v_new_meta, '{password_change_consumed}', 'true'::jsonb,  TRUE);
        v_new_meta := jsonb_set(v_new_meta, '{requires_password_change}', 'false'::jsonb, TRUE);
        NEW.raw_app_meta_data := v_new_meta;

        -- Insert protected transaction authorization for student_profiles trigger
        -- tr_protect_student_onboarding_identity is the SOLE consumer.
        INSERT INTO public.password_sync_authorizations (txid, user_id, operation)
        VALUES (pg_current_xact_id()::text, NEW.id, 'PASSWORD_SYNC');

        UPDATE public.student_profiles
        SET    password_change_consumed  = TRUE,
               requires_password_change  = FALSE
        WHERE  user_id = NEW.id;

    END IF;

    RETURN NEW;
END;
$$;

-- Explicitly set function ownership to postgres
ALTER FUNCTION public.enforce_one_time_password_change() OWNER TO postgres;

-- Trigger functions are invoked by the engine, not by user SQL.
-- Strip execute privileges from all untrusted client roles (PUBLIC, anon, authenticated).
-- Grant execute specifically to internal auth services (supabase_auth_admin, service_role, postgres)
-- to guarantee the auth.users trigger fires seamlessly during GoTrue authentication operations.
REVOKE EXECUTE ON FUNCTION public.enforce_one_time_password_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_one_time_password_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_one_time_password_change() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.enforce_one_time_password_change() TO postgres, supabase_auth_admin, service_role;

DROP TRIGGER IF EXISTS tr_enforce_one_time_password_change ON auth.users;
CREATE TRIGGER tr_enforce_one_time_password_change
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_one_time_password_change();

-- ============================================================================
-- SECTION 6: protect_student_onboarding_identity() — student_profiles BEFORE UPDATE trigger
--
-- Immutability model:
--   For authenticated non-admin sessions, identity fields (roll_number,
--   enrollment_number, father_name, branch_code, section) are permanently
--   immutable.
--
--   Password flags (password_change_consumed, requires_password_change) may
--   ONLY be modified when a matching record exists in public.password_sync_authorizations
--   matching the exact current transaction ID (pg_current_xact_id()), target user UUID,
--   and operation 'PASSWORD_SYNC'.
--   This record is consumed (deleted) atomically upon verification.
--
--   Custom GUCs (set_config/current_setting) are NOT trusted.
--   pg_trigger_depth() is NOT trusted.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_student_onboarding_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_id     UUID;
    v_required_op VARCHAR(50);
BEGIN
    -- 1. Identity fields immutability:
    -- Strictly enforced for authenticated non-admin users.
    IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
            RAISE EXCEPTION 'Access Denied: Student roll number is immutable.';
        END IF;
        IF NEW.enrollment_number IS DISTINCT FROM OLD.enrollment_number THEN
            RAISE EXCEPTION 'Access Denied: Student enrollment number is immutable.';
        END IF;
        IF NEW.father_name IS DISTINCT FROM OLD.father_name THEN
            RAISE EXCEPTION 'Access Denied: Student father name is immutable.';
        END IF;
        IF NEW.branch_code IS DISTINCT FROM OLD.branch_code THEN
            RAISE EXCEPTION 'Access Denied: Student branch_code is immutable.';
        END IF;
        IF NEW.section IS DISTINCT FROM OLD.section THEN
            RAISE EXCEPTION 'Access Denied: Student section is immutable.';
        END IF;
    END IF;

    -- 2. Password security flags and status protection:
    -- Modifying password_change_consumed, requires_password_change, or status requires
    -- consuming a valid authorization record generated by enforce_one_time_password_change()
    -- in this exact transaction.
    -- This protection applies UNCONDITIONALLY to all roles and sessions (including direct SQL updates).
    IF (NEW.password_change_consumed  IS DISTINCT FROM OLD.password_change_consumed OR
        NEW.requires_password_change  IS DISTINCT FROM OLD.requires_password_change OR
        NEW.status                    IS DISTINCT FROM OLD.status)
    THEN
        -- Determine the exact, narrowly-scoped operation required:
        -- Status change to LOCKED specifically demands a 'RECOVERY_LOCK' authorization.
        -- Standard password flag synchronizations specifically demand a 'PASSWORD_SYNC' authorization.
        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'LOCKED' THEN
            v_required_op := 'RECOVERY_LOCK';
        ELSE
            v_required_op := 'PASSWORD_SYNC';
        END IF;

        -- Sole, atomic consumer: DELETE ... RETURNING
        DELETE FROM public.password_sync_authorizations
        WHERE  txid      = pg_current_xact_id()::text
          AND  user_id   = NEW.user_id
          AND  operation = v_required_op
        RETURNING id INTO v_auth_id;

        IF v_auth_id IS NULL THEN
            RAISE EXCEPTION
                'Access Denied: Password security flags (password_change_consumed, '
                'requires_password_change, status) may not be modified directly. '
                'No valid % authorization exists for this transaction.', v_required_op;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Explicitly set function ownership to postgres
ALTER FUNCTION public.protect_student_onboarding_identity() OWNER TO postgres;

-- Authenticated users need EXECUTE because triggers fire under the invoking role.
-- The function is SECURITY DEFINER so table access runs as postgres.
REVOKE EXECUTE ON FUNCTION public.protect_student_onboarding_identity() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.protect_student_onboarding_identity()
    TO authenticated, anon, service_role, postgres;

DROP TRIGGER IF EXISTS tr_protect_student_onboarding_identity ON public.student_profiles;
CREATE TRIGGER tr_protect_student_onboarding_identity
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_student_onboarding_identity();

COMMIT;
